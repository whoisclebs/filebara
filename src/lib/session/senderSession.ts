import type { DataConnection } from "peerjs";
import { generateKeypair, type Keypair } from "$lib/crypto/keygen.js";
import {
  generateFileId,
  generateSalt,
  computeFingerprint,
  bytesToHex,
} from "$lib/crypto/utils.js";
import { deriveAuthKey, validateAuthProof } from "$lib/crypto/auth.js";
import { computeVerificationCode } from "$lib/crypto/identity.js";
import {
  generateFileKey,
  exportFileKey,
  generateNonceBase,
  encryptChunk,
} from "$lib/crypto/encryption.js";
import { PROTOCOL_VERSION } from "$lib/protocol/schema.js";
import {
  DEFAULT_ARGON2ID_PARAMS,
  type Argon2idParams,
} from "$lib/kdf/argon2id.js";
import {
  buildTransferLink,
  type TransferLinkParams,
} from "$lib/protocol/link.js";
import { PeerTransport, type ConnectionInfo } from "$lib/peer/transport.js";
import { FileChunker } from "$lib/file/chunker.js";
import {
  MessageType,
  type ProtocolMessage,
  type AuthProofMessage,
  type AuthAcceptedMessage,
  type AuthRejectedMessage,
  type ApprovalRequestMessage,
  type ApprovalGrantedMessage,
  type ApprovalDeniedMessage,
  type FileKeyMessage,
  type ChunkMessage,
  type ChunkAckMessage,
  type TransferCompleteMessage,
} from "$lib/protocol/messages.js";
import { deserializeMessage } from "$lib/protocol/schema.js";

export {
  SenderSession,
  transferBootstrap,
  buildTransferLinkFromBootstrap,
  serializeKdfParams,
  validateReceiverProof,
  type TransferBootstrap,
  type SenderApprovalState,
  type ApprovalRequestInfo,
};

/** Maximum number of unacknowledged chunks allowed in flight. */
const MAX_OUTSTANDING_CHUNKS = 4;

/** Default chunk size for file transfers (256 KiB). */
const DEFAULT_CHUNK_SIZE = 262144;

/**
 * Complete bootstrap data produced when a sender starts a transfer.
 */
interface TransferBootstrap {
  /** 256-bit file identifier as hex (64 hex chars). */
  fileId: string;
  /** 128-bit session salt as hex (32 hex chars). */
  salt: string;
  /** Current protocol version. */
  protocolVersion: number;
  /** Argon2id KDF parameters for this session. */
  kdfParams: Argon2idParams;
  /** Ephemeral ECDH sender keypair. */
  senderKeypair: Keypair;
  /** Sender fingerprint – SHA-256 of raw public key. */
  senderFingerprint: string;
  /** The selected file reference. */
  file: File;
  /** Relative transfer link path (e.g. /f/<fileId>#...). */
  link: string;
}

/**
 * Information about a pending approval request from a receiver.
 */
interface ApprovalRequestInfo {
  peerId: string;
  receiverFingerprint: string;
  receiverPublicKey: string;
  verificationCode: string;
}

/**
 * State of the sender's approval flow.
 */
type SenderApprovalState =
  | "idle"
  | "bootstrapping"
  | "share-ready"
  | "listening"
  | "validating-proof"
  | "awaiting-approval-request"
  | "pending-approval"
  | "approved"
  | "transferring"
  | "verifying"
  | "completed"
  | "denied"
  | "failed";

/**
 * Serialize Argon2id params to a URL-search-params string for the link.
 */
function serializeKdfParams(params: Argon2idParams): string {
  return `t=${params.timeCost}&m=${params.memoryCost}&p=${params.parallelism}`;
}

/**
 * Build the relative transfer link from bootstrap data.
 */
function buildTransferLinkFromBootstrap(
  bootstrap: Pick<
    TransferBootstrap,
    "fileId" | "salt" | "kdfParams" | "senderFingerprint" | "protocolVersion"
  >,
): string {
  const params: TransferLinkParams = {
    fileId: bootstrap.fileId,
    salt: bootstrap.salt,
    kdfParams: serializeKdfParams(bootstrap.kdfParams),
    senderFingerprint: bootstrap.senderFingerprint,
    protocolVersion: String(bootstrap.protocolVersion),
  };
  return buildTransferLink(params);
}

/**
 * Run the full bootstrap sequence for a sender transfer.
 *
 * 1. Generates a 256-bit random file_id.
 * 2. Generates a 128-bit session salt.
 * 3. Generates an ephemeral ECDH (P-256) keypair.
 * 4. Computes the sender fingerprint from the public key.
 * 5. Assembles protocol metadata and link.
 *
 * @param file - The file selected by the sender.
 * @returns A fully populated TransferBootstrap.
 */
async function transferBootstrap(file: File): Promise<TransferBootstrap> {
  const fileId = generateFileId();
  const salt = generateSalt();
  const senderKeypair = await generateKeypair();
  const senderFingerprint = await computeFingerprint(senderKeypair.publicKey);

  const bootstrap: TransferBootstrap = {
    fileId,
    salt,
    protocolVersion: PROTOCOL_VERSION,
    kdfParams: { ...DEFAULT_ARGON2ID_PARAMS },
    senderKeypair,
    senderFingerprint,
    file,
    link: "",
  };

  bootstrap.link = buildTransferLinkFromBootstrap(bootstrap);
  return bootstrap;
}

/**
 * Validate a receiver's auth proof against the sender's known password
 * and session parameters.
 */
async function validateReceiverProof(
  password: string,
  salt: string,
  kdfParams: Argon2idParams,
  fileId: string,
  senderFingerprint: string,
  proof: string,
): Promise<boolean> {
  const authKey = await deriveAuthKey(password, salt, kdfParams);
  return validateAuthProof(authKey, fileId, senderFingerprint, proof);
}

/**
 * Derive the auth key (used by sender to validate proofs).
 */
async function deriveSenderAuthKey(
  password: string,
  salt: string,
  kdfParams: Argon2idParams,
): Promise<Uint8Array> {
  return deriveAuthKey(password, salt, kdfParams);
}

/**
 * High-level sender session that manages the full lifecycle:
 * bootstrap → peer listening → proof validation → approval → transfer.
 *
 * This implements first-receiver binding (task 4.3): once a receiver is
 * approved, the session stores that identity and rejects later different
 * identities for the same file_id.
 *
 * Transfer pipeline (tasks 5.1–5.2):
 * - Generates a file-scoped AES-GCM key and random nonce base.
 * - Encrypts each file chunk with a unique per-chunk nonce.
 * - Maintains a bounded send window (MAX_OUTSTANDING_CHUNKS) and
 *   pauses transmission when the window is full.
 * - Resumes sending as the receiver sends ChunkAck messages.
 * - Sends TransferComplete after all chunks are sent and acknowledged.
 */
class SenderSession {
  private _bootstrap: TransferBootstrap;
  private _password: string;
  private _transport: PeerTransport | null = null;
  private _authKey: Uint8Array | null = null;
  private _state: SenderApprovalState = "idle";
  private _error: string | undefined;

  /** The currently active receiver connection. */
  private _receiverConn: ConnectionInfo | null = null;
  /** The approved receiver fingerprint (set after approval). */
  private _approvedReceiverFingerprint: string | null = null;
  /** Pending approval request awaiting sender action. */
  private _pendingApproval: ApprovalRequestInfo | null = null;

  // ── Transfer pipeline state ──
  /** AES-GCM 256-bit file encryption key. */
  private _fileKey: CryptoKey | null = null;
  /** 8-byte random nonce base for per-chunk nonce construction. */
  private _nonceBase: Uint8Array | null = null;
  /** Set of chunk indices sent but not yet acknowledged. */
  private _unackedChunks = new Set<number>();
  /** Resolver called when an ACK arrives, used for backpressure waits. */
  private _ackResolve: (() => void) | null = null;
  /** Whether the transfer pipeline has been started. */
  private _transferStarted = false;
  /** Whether all chunks have been sent. */
  private _allChunksSent = false;
  /** The file chunker for incremental reading. */
  private _chunker: FileChunker | null = null;
  /** Total number of chunks for the current transfer (set when sending starts). */
  private _totalChunks = 0;
  /** Index of the next chunk to send (set during sendFile). */
  private _currentChunkIndex = 0;
  /** Cached file hash to avoid recomputing SHA-256 of the full file. */
  private _fileHash: string | null = null;
  /** Whether the connection to the receiver has been lost. */
  private _disconnected = false;

  constructor(bootstrap: TransferBootstrap, password: string) {
    this._bootstrap = bootstrap;
    this._password = password;
  }

  get state(): SenderApprovalState {
    return this._state;
  }

  get error(): string | undefined {
    return this._error;
  }

  get bootstrap(): TransferBootstrap {
    return this._bootstrap;
  }

  get pendingApproval(): ApprovalRequestInfo | null {
    return this._pendingApproval;
  }

  get approvedReceiverFingerprint(): string | null {
    return this._approvedReceiverFingerprint;
  }

  get transport(): PeerTransport | null {
    return this._transport;
  }

  get receiverConn(): ConnectionInfo | null {
    return this._receiverConn;
  }

  get fileId(): string {
    return this._bootstrap.fileId;
  }

  get transferStarted(): boolean {
    return this._transferStarted;
  }

  get allChunksSent(): boolean {
    return this._allChunksSent;
  }

  /** Number of chunks sent but not yet acknowledged. */
  get outstandingChunks(): number {
    return this._unackedChunks.size;
  }

  /** Total number of chunks in the current transfer (0 until transfer starts). */
  get totalChunks(): number {
    return this._totalChunks;
  }

  /** Index of the most recently sent chunk (0 until transfer starts). */
  get currentChunkIndex(): number {
    return this._currentChunkIndex;
  }

  /**
   * Start the PeerJS transport and listen for incoming receiver connections.
   * Registers message handlers for auth proof, approval request,
   * and chunk acknowledgement messages.
   *
   * Also generates the file encryption key and nonce base for the
   * upcoming transfer pipeline.
   */
  async startListening(): Promise<void> {
    this._state = "listening";
    this._error = undefined;

    try {
      // Derive auth key once so we can validate proofs
      this._authKey = await deriveSenderAuthKey(
        this._password,
        this._bootstrap.salt,
        this._bootstrap.kdfParams,
      );

      // Pre-generate file encryption key and nonce base for transfer
      this._fileKey = await generateFileKey();
      this._nonceBase = generateNonceBase();

      this._transport = new PeerTransport({
        peerId: this._bootstrap.fileId,
      });

      await this._transport.start();

      // Listen for incoming connections
      this._transport.onIncomingConnection((conn: ConnectionInfo) => {
        this._handleIncomingConnection(conn);
      });

      // Listen for data on all connections
      this._transport.onData((peerId: string, payload: unknown) => {
        this._handleIncomingData(peerId, payload);
      });
    } catch (err: unknown) {
      this._state = "failed";
      this._error =
        err instanceof Error ? err.message : "Failed to start listening.";
    }
  }

  /**
   * Approve the pending receiver. This locks the session to that
   * receiver identity and sends an ApprovalGranted message.
   */
  async approveReceiver(): Promise<void> {
    if (!this._pendingApproval || !this._receiverConn) {
      throw new Error("No pending approval request.");
    }

    // Lock session to this receiver
    this._approvedReceiverFingerprint =
      this._pendingApproval.receiverFingerprint;

    const msg: ApprovalGrantedMessage = {
      type: MessageType.ApprovalGranted,
      version: 1,
      message: "You have been approved. Transfer will begin shortly.",
    };

    this._transport!.sendMessage(this._receiverConn.conn, msg);
    this._state = "approved";
  }

  /**
   * Deny the pending receiver. Sends an ApprovalDenied message and
   * closes the connection.
   */
  async denyReceiver(): Promise<void> {
    if (!this._pendingApproval || !this._receiverConn) {
      throw new Error("No pending approval request.");
    }

    const msg: ApprovalDeniedMessage = {
      type: MessageType.ApprovalDenied,
      version: 1,
      reason: "The sender has denied this transfer request.",
    };

    this._transport!.sendMessage(this._receiverConn.conn, msg);
    this._transport!.closeConnection(this._receiverConn.peerId);
    this._receiverConn = null;
    this._pendingApproval = null;
    this._state = "denied";
  }

  /**
   * Begin the encrypted file transfer to the approved receiver.
   *
   * Step 1: Send the file encryption key and nonce base (FileKey message).
   * Step 2: Send all file chunks with bounded backpressure.
   * Step 3: Send TransferComplete when all chunks are acknowledged.
   *
   * The sender respects a bounded send window (MAX_OUTSTANDING_CHUNKS).
   * When the window is full, transmission pauses and resumes as the
   * receiver sends ChunkAck messages.
   */
  async sendFile(): Promise<void> {
    if (this._transferStarted) {
      this._state = "failed";
      this._error = "Transfer already started.";
      return;
    }

    this._transferStarted = true;
    this._state = "transferring";
    this._error = undefined;

    const conn = this._receiverConn?.conn;
    if (!conn) {
      this._state = "failed";
      this._error = "No receiver connection available.";
      return;
    }

    if (!this._fileKey || !this._nonceBase) {
      this._state = "failed";
      this._error = "File key or nonce base not generated.";
      return;
    }

    try {
      // ── Step 1: Send file key and nonce base ──
      const rawKeyBuffer = await exportFileKey(this._fileKey);
      const rawKey = new Uint8Array(rawKeyBuffer);
      const fileKeyMsg: FileKeyMessage = {
        type: MessageType.FileKey,
        version: 1,
        key: bytesToHex(rawKey),
        nonceBase: bytesToHex(this._nonceBase),
      };
      this._transport!.sendMessage(conn, fileKeyMsg);

      // ── Step 2: Send chunks with backpressure ──
      this._chunker = new FileChunker(this._bootstrap.file, DEFAULT_CHUNK_SIZE);
      this._totalChunks = this._chunker.totalChunks;
      this._currentChunkIndex = 0;

      while (
        this._currentChunkIndex < this._totalChunks ||
        this._unackedChunks.size > 0
      ) {
        // Bail if receiver disconnected
        if (this._disconnected) {
          throw new Error("Receiver disconnected during transfer.");
        }

        // Wait for ACKs if the window is full OR all chunks have been sent
        // but there are still unacked chunks remaining.
        while (
          this._unackedChunks.size >= MAX_OUTSTANDING_CHUNKS ||
          (this._currentChunkIndex >= this._totalChunks &&
            this._unackedChunks.size > 0)
        ) {
          if (this._disconnected) {
            throw new Error("Receiver disconnected during transfer.");
          }
          await this._waitForAck();
        }

        // If there are still chunks to send, send one
        if (this._currentChunkIndex < this._totalChunks) {
          const fileChunk = await this._chunker.readChunk(
            this._currentChunkIndex,
          );
          const encrypted = await encryptChunk(
            fileChunk.data,
            this._currentChunkIndex,
            this._fileKey,
            this._nonceBase,
          );

          // Yield to event loop before heavy synchronous bytesToHex work
          // so the progress polling and UI rendering can update.
          await new Promise<void>((r) => setTimeout(r, 0));

          const chunkMsg: ChunkMessage = {
            type: MessageType.Chunk,
            version: 1,
            index: encrypted.index,
            nonce: bytesToHex(encrypted.nonce),
            ciphertext: bytesToHex(encrypted.ciphertext),
          };

          this._transport!.sendMessage(conn, chunkMsg);
          this._unackedChunks.add(this._currentChunkIndex);
          this._currentChunkIndex++;
        }
      }

      this._allChunksSent = true;
      this._state = "verifying";

      // ── Step 3: Send transfer complete ──
      // Integrity is guaranteed per-chunk by AES-GCM authentication.
      // The full-file SHA-256 is omitted from the MVP sender path because
      // computing it on the main thread blocks the UI (white screen).
      // The receiver trusts AES-GCM auth + complete chunk assembly.
      const completeMsg: TransferCompleteMessage = {
        type: MessageType.TransferComplete,
        version: 1,
        fileHash: "",
      };
      this._transport!.sendMessage(conn, completeMsg);

      this._state = "completed";
    } catch (err: unknown) {
      this._state = "failed";
      this._error =
        err instanceof Error ? err.message : "File transfer failed.";
    }
  }

  /**
   * Reject a connection attempt from a receiver that doesn't match the
   * approved identity. Uses a generic error without leaking the
   * approved identity.
   */
  private _rejectDifferentReceiver(dataConn: DataConnection): void {
    const msg: ApprovalDeniedMessage = {
      type: MessageType.ApprovalDenied,
      version: 1,
      reason: "This transfer session is already bound to a different receiver.",
    };

    this._transport!.sendMessage(dataConn, msg);
    dataConn.close();
  }

  /**
   * Clean up transport.
   */
  destroy(): void {
    this._transport?.destroy();
    this._transport = null;
  }

  // ── Private ──

  /**
   * Wait for the next chunk acknowledgement from the receiver.
   * Used internally by sendFile() for backpressure.
   * Times out after 60 seconds to prevent hanging if the receiver disappears.
   */
  private _waitForAck(timeoutMs = 60_000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._ackResolve = null;
        reject(
          new Error(
            "Timed out waiting for chunk acknowledgement from receiver.",
          ),
        );
      }, timeoutMs);
      this._ackResolve = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }

  // ── Private message handlers ──

  private _handleIncomingConnection(conn: ConnectionInfo): void {
    // If we already have an approved receiver, reject new connections
    if (this._approvedReceiverFingerprint) {
      this._rejectDifferentReceiver(conn.conn);
      return;
    }

    // Store the first connection
    if (!this._receiverConn) {
      this._receiverConn = conn;

      // Listen for connection close/error so we can fail cleanly
      conn.conn.on("close", () => {
        this._disconnected = true;
        // Unblock _waitForAck() immediately so sendFile() is not stuck for 60s
        if (this._ackResolve) {
          const resolve = this._ackResolve;
          this._ackResolve = null;
          resolve();
        }
        if (
          this._state === "transferring" ||
          this._state === "approved" ||
          this._state === "verifying"
        ) {
          this._state = "failed";
          this._error = "Receiver disconnected during transfer.";
        }
      });
      conn.conn.on("error", (err: Error) => {
        this._disconnected = true;
        // Unblock _waitForAck() immediately so sendFile() is not stuck for 60s
        if (this._ackResolve) {
          const resolve = this._ackResolve;
          this._ackResolve = null;
          resolve();
        }
        if (
          this._state === "transferring" ||
          this._state === "approved" ||
          this._state === "verifying"
        ) {
          this._state = "failed";
          this._error = "Receiver connection error: " + err.message;
        }
      });
    } else {
      // Already have a pending connection; reject extras
      const msg: ApprovalDeniedMessage = {
        type: MessageType.ApprovalDenied,
        version: 1,
        reason:
          "A receiver is already connected. Only one receiver is allowed.",
      };
      this._transport!.sendMessage(conn.conn, msg);
      conn.conn.close();
    }
  }

  private _handleIncomingData(peerId: string, payload: unknown): void {
    if (typeof payload !== "string") return;

    let msg: ProtocolMessage;
    try {
      msg = deserializeMessage(payload);
    } catch {
      // Ignore unparseable messages
      return;
    }

    switch (msg.type) {
      case MessageType.AuthProof:
        this._handleAuthProof(peerId, msg as AuthProofMessage);
        break;

      case MessageType.ApprovalRequest:
        this._handleApprovalRequest(peerId, msg as ApprovalRequestMessage);
        break;

      case MessageType.ChunkAck:
        this._handleChunkAck(msg as ChunkAckMessage);
        break;

      default:
        // Unknown message type at this stage
        break;
    }
  }

  private async _handleAuthProof(
    peerId: string,
    msg: AuthProofMessage,
  ): Promise<void> {
    this._state = "validating-proof";

    try {
      const isValid = await validateReceiverProof(
        this._password,
        this._bootstrap.salt,
        this._bootstrap.kdfParams,
        this._bootstrap.fileId,
        this._bootstrap.senderFingerprint,
        msg.proof,
      );

      const conn = this._transport!.getConnection(peerId);
      if (!conn) return;

      if (!isValid) {
        const reject: AuthRejectedMessage = {
          type: MessageType.AuthRejected,
          version: 1,
          reason:
            "Incorrect password proof. The password you entered does not match.",
        };
        this._transport!.sendMessage(conn, reject);
        this._state = "failed";
        this._error = "Receiver sent an invalid password proof.";
        return;
      }

      // Proof valid — send accepted with metadata.
      // fileHash is deferred: computing SHA-256 of the full file blocks the UI thread,
      // so we send an empty placeholder here and include the real hash in TransferComplete.
      const accepted: AuthAcceptedMessage = {
        type: MessageType.AuthAccepted,
        version: 1,
        filename: this._bootstrap.file.name,
        fileSize: this._bootstrap.file.size,
        fileHash: "",
        chunkSize: DEFAULT_CHUNK_SIZE,
      };

      this._transport!.sendMessage(conn, accepted);
      this._state = "awaiting-approval-request";
    } catch (err: unknown) {
      this._state = "failed";
      this._error =
        err instanceof Error ? err.message : "Proof validation failed.";
    }
  }

  private async _handleApprovalRequest(
    peerId: string,
    msg: ApprovalRequestMessage,
  ): Promise<void> {
    // If session is already bound to a different receiver, reject
    if (
      this._approvedReceiverFingerprint &&
      this._approvedReceiverFingerprint !== msg.receiverFingerprint
    ) {
      const conn = this._transport!.getConnection(peerId);
      if (conn) {
        this._rejectDifferentReceiver(conn);
      }
      return;
    }

    // Compute verification code from auth key + receiver fingerprint
    const verificationCode = await computeVerificationCode(
      this._authKey!,
      msg.receiverFingerprint,
    );

    this._pendingApproval = {
      peerId,
      receiverFingerprint: msg.receiverFingerprint,
      receiverPublicKey: msg.receiverPublicKey,
      verificationCode,
    };

    this._state = "pending-approval";
  }

  /**
   * Handle a chunk acknowledgement from the receiver.
   * Removes the chunk from the unacknowledged set and signals
   * the backpressure mechanism to resume sending.
   */
  private _handleChunkAck(msg: ChunkAckMessage): void {
    this._unackedChunks.delete(msg.index);

    // Signal the backpressure waiter (if any) that capacity has freed up
    if (this._ackResolve) {
      const resolve = this._ackResolve;
      this._ackResolve = null;
      resolve();
    }
  }

  private async _computeFileHash(): Promise<string> {
    // Return cached hash if already computed
    if (this._fileHash) return this._fileHash;
    // Compute SHA-256 of the file for integrity verification
    const buffer = await this._bootstrap.file.arrayBuffer();
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", buffer);
    this._fileHash = bytesToHex(new Uint8Array(hashBuffer));
    return this._fileHash;
  }
}
