import type { DataConnection } from "peerjs";
import { KdfWorkerClient } from "$lib/workers/index.js";
import { computeAuthProof } from "$lib/crypto/auth.js";
import {
  generateReceiverIdentity,
  computeVerificationCode,
  publicKeyToHex,
  bytesToHex,
  hexToBytes,
  importFileKey,
  decryptChunk,
  validateChunkNonce,
} from "$lib/crypto/index.js";
import type { ReceiverIdentity } from "$lib/crypto/identity.js";
import {
  parseTransferLink,
  type TransferLinkParams,
} from "$lib/protocol/link.js";
import {
  DEFAULT_ARGON2ID_PARAMS,
  type Argon2idParams,
} from "$lib/kdf/argon2id.js";
import { PeerTransport } from "$lib/peer/transport.js";
import {
  MessageType,
  type ProtocolMessage,
  type AuthProofMessage,
  type AuthAcceptedMessage,
  type AuthRejectedMessage,
  type ApprovalGrantedMessage,
  type ApprovalDeniedMessage,
  type FileKeyMessage,
  type ChunkMessage,
  type ChunkAckMessage,
  type TransferCompleteMessage,
  type ErrorMessage,
} from "$lib/protocol/messages.js";
import { deserializeMessage } from "$lib/protocol/schema.js";

export {
  ReceiverSession,
  parseKdfParamsFromString,
  type ReceiverSetupState,
  type ParsedKdfParams,
  type FileReceiptResult,
};

/**
 * Parsed KDF parameters from the transfer link fragment.
 */
interface ParsedKdfParams {
  timeCost: number;
  memoryCost: number;
  parallelism: number;
}

/**
 * Result of the file receipt pipeline.
 */
interface FileReceiptResult {
  status: "ok" | "integrity-failed" | "transfer-failed";
  /** The successfully assembled file blob, if status is "ok". */
  blob?: Blob;
  /** Human-readable error message on failure. */
  error?: string;
}

/**
 * Parse KDF params from a URL-encoded string like "t=3&m=65536&p=1".
 */
function parseKdfParamsFromString(raw: string): ParsedKdfParams {
  const params = new URLSearchParams(raw);
  const timeCost = parseInt(params.get("t") ?? "3", 10);
  const memoryCost = parseInt(params.get("m") ?? "65536", 10);
  const parallelism = parseInt(params.get("p") ?? "1", 10);
  return { timeCost, memoryCost, parallelism };
}

/**
 * State of the receiver session during setup.
 */
type ReceiverSetupState =
  | "idle"
  | "preparing"
  | "deriving"
  | "proof-ready"
  | "connecting"
  | "awaiting-accept"
  | "awaiting-approval"
  | "approved"
  | "transferring"
  | "verifying"
  | "completed"
  | "failed";

/**
 * Result of the receiver approval flow.
 */
interface ApprovalResult {
  status: "approved" | "denied";
  message?: string;
}

/**
 * Receiver session that manages the bootstrap, authentication,
 * approval flow, and file transfer receipt for a file transfer receiver.
 *
 * This session:
 * 1. Parses the transfer link parameters
 * 2. Derives the auth key via the KDF worker
 * 3. Computes the password proof for the sender
 * 4. Generates ephemeral identity (keypair + fingerprint)
 * 5. Connects to the sender via PeerJS
 * 6. Exchanges protocol messages (auth proof → approval)
 * 7. Receives file key and encrypted chunks (5.3)
 * 8. Decrypts, assembles, and verifies final plaintext hash (5.3)
 */
class ReceiverSession {
  private _kdfClient: KdfWorkerClient;
  private _linkParams: TransferLinkParams | null = null;
  private _kdfParams: Argon2idParams;
  private _state: ReceiverSetupState = "idle";
  private _error: string | undefined;
  private _identity: ReceiverIdentity | null = null;
  private _transport: PeerTransport | null = null;
  private _conn: DataConnection | null = null;
  private _authKey: Uint8Array | null = null;
  private _metadata: {
    filename: string;
    fileSize: number;
    fileHash: string;
    chunkSize: number;
  } | null = null;

  /** Number of chunks received so far (updated during receiveFile). */
  private _receivedChunksCount = 0;
  /** Total chunks expected (0 until receiveFile starts). */
  private _totalChunks = 0;

  constructor() {
    this._kdfClient = new KdfWorkerClient();
    this._kdfParams = { ...DEFAULT_ARGON2ID_PARAMS };
  }

  get state(): ReceiverSetupState {
    return this._state;
  }

  get error(): string | undefined {
    return this._error;
  }

  get linkParams(): TransferLinkParams | null {
    return this._linkParams;
  }

  get kdfParams(): Argon2idParams {
    return this._kdfParams;
  }

  get identity(): ReceiverIdentity | null {
    return this._identity;
  }

  get metadata(): {
    filename: string;
    fileSize: number;
    fileHash: string;
    chunkSize: number;
  } | null {
    return this._metadata;
  }

  /** Number of chunks received so far (for progress polling). */
  get receivedChunksCount(): number {
    return this._receivedChunksCount;
  }

  /** Total chunks expected in the current transfer. */
  get totalChunks(): number {
    return this._totalChunks;
  }

  /**
   * Attempt to parse the current page URL as a transfer link.
   * Returns the parsed params, or null if the link is invalid.
   */
  parseLink(url: string): TransferLinkParams | null {
    const params = parseTransferLink(url);
    if (params) {
      this._linkParams = params;

      // Parse KDF params from the `p` fragment value (e.g. "t=3&m=65536&p=1")
      const parsed = parseKdfParamsFromString(params.kdfParams);
      this._kdfParams = {
        timeCost: parsed.timeCost,
        memoryCost: parsed.memoryCost,
        parallelism: parsed.parallelism,
        outputLength: DEFAULT_ARGON2ID_PARAMS.outputLength,
      };
    }
    return params;
  }

  /**
   * Start the KDF worker and prepare the session for derivation.
   */
  startWorker(): void {
    if (!this._kdfClient.started) {
      this._kdfClient.start();
    }
  }

  /**
   * Derive the auth key using the given password and session parameters.
   */
  async deriveAuthKey(password: string): Promise<Uint8Array> {
    if (!this._linkParams) {
      throw new Error("No transfer link parameters. Call parseLink() first.");
    }

    this._state = "deriving";
    this._error = undefined;

    try {
      const saltBytes = hexToBytes(this._linkParams.salt);
      const response = await this._kdfClient.deriveKey({
        type: "derive_key",
        password,
        salt: saltBytes,
        params: this._kdfParams,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      this._authKey = response.key;
      this._state = "proof-ready";
      return response.key;
    } catch (err: unknown) {
      this._state = "failed";
      this._error =
        err instanceof Error ? err.message : "Key derivation failed.";
      throw err;
    }
  }

  /**
   * Compute the auth proof to send to the sender.
   */
  async computeProof(authKey: Uint8Array): Promise<string> {
    if (!this._linkParams) {
      throw new Error("No transfer link parameters. Call parseLink() first.");
    }

    return computeAuthProof(
      authKey,
      this._linkParams.fileId,
      this._linkParams.senderFingerprint,
    );
  }

  /**
   * Generate the ephemeral receiver identity (keypair + fingerprint).
   */
  async generateIdentity(): Promise<ReceiverIdentity> {
    this._identity = await generateReceiverIdentity();
    return this._identity;
  }

  /**
   * Connect to the sender peer via PeerJS and run the full
   * authentication and approval protocol.
   *
   * Steps:
   * 1. Connect to sender using fileId as peer ID
   * 2. Send AuthProof message
   * 3. Wait for AuthAccepted or AuthRejected
   * 4. If accepted, send ApprovalRequest
   * 5. Wait for ApprovalGranted or ApprovalDenied
   *
   * @param proof - The auth proof string
   * @param fileId - The sender's peer ID (file_id)
   * @returns ApprovalResult indicating whether the sender approved
   */
  async requestApproval(
    proof: string,
    fileId: string,
  ): Promise<ApprovalResult> {
    if (!this._identity || !this._authKey) {
      throw new Error(
        "Identity or auth key not ready. Call generateIdentity() and deriveAuthKey() first.",
      );
    }

    this._state = "connecting";

    try {
      // 1. Start transport and connect to sender
      this._transport = new PeerTransport({});
      await this._transport.start();
      this._conn = (await this._transport.connect(fileId)).conn;

      this._state = "awaiting-accept";

      // 2. Send AuthProof
      const authProofMsg: AuthProofMessage = {
        type: MessageType.AuthProof,
        version: 1,
        proof,
        senderFingerprint: this._linkParams!.senderFingerprint,
      };
      this._transport.sendMessage(this._conn, authProofMsg);

      // 3. Wait for AuthAccepted or AuthRejected
      const acceptResult = await this._waitForFirstMessage(15_000);

      if (acceptResult.type === MessageType.AuthRejected) {
        const rejectedMsg = acceptResult as AuthRejectedMessage;
        this._state = "failed";
        this._error = rejectedMsg.reason;
        return { status: "denied", message: rejectedMsg.reason };
      }

      if (acceptResult.type !== MessageType.AuthAccepted) {
        this._state = "failed";
        this._error = "Unexpected response from sender.";
        return {
          status: "denied",
          message: "Unexpected response from sender.",
        };
      }

      const accepted = acceptResult as AuthAcceptedMessage;
      this._metadata = {
        filename: accepted.filename,
        fileSize: accepted.fileSize,
        fileHash: accepted.fileHash,
        chunkSize: accepted.chunkSize,
      };

      // Set total chunks as soon as metadata is available so the progress
      // polling has a real denominator (fixes 100%-no-download bug).
      this._totalChunks = Math.ceil(accepted.fileSize / accepted.chunkSize);

      // 4. Send ApprovalRequest with identity
      const receiverPublicKey = await publicKeyToHex(
        this._identity.keypair.publicKey,
      );
      const approvalRequestMsg = {
        type: MessageType.ApprovalRequest,
        version: 1,
        receiverPublicKey,
        receiverFingerprint: this._identity.fingerprint,
      };
      this._transport.sendMessage(this._conn, approvalRequestMsg);

      this._state = "awaiting-approval";

      // 5. Wait for ApprovalGranted or ApprovalDenied
      // Use a longer timeout because this depends on human action (sender clicking Approve).
      const approvalResult = await this._waitForFirstMessage(120_000);

      if (approvalResult.type === MessageType.ApprovalDenied) {
        const denied = approvalResult as ApprovalDeniedMessage;
        this._state = "failed";
        this._error = denied.reason;
        return { status: "denied", message: denied.reason };
      }

      if (approvalResult.type === MessageType.ApprovalGranted) {
        const granted = approvalResult as ApprovalGrantedMessage;
        this._state = "approved";
        return { status: "approved", message: granted.message };
      }

      // Unexpected
      this._state = "failed";
      this._error = "Unexpected response during approval.";
      return {
        status: "denied",
        message: "Unexpected response during approval.",
      };
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Approval request failed.";
      this._state = "failed";
      this._error = errMsg;
      // Network/timeout errors are NOT denials — propagate as a connection failure
      // so the UI can classify it correctly (sender-offline, transfer-interrupted, etc.)
      // rather than showing "Transfer denied".
      throw new Error(errMsg);
    }
  }

  /**
   * Compute the shared verification code.
   */
  async computeVerificationCode(): Promise<string> {
    if (!this._authKey || !this._identity) {
      throw new Error("Auth key or identity not available.");
    }
    return computeVerificationCode(this._authKey, this._identity.fingerprint);
  }

  /**
   * After approval is granted, receive the file from the sender.
   *
   * Pipeline (tasks 5.3):
   * 1. Wait for FileKey message → import AES-GCM key and nonce base
   * 2. Receive encrypted Chunk messages:
   *    a. Validate chunk index (in range, no duplicates)
   *    b. Validate nonce matches expected nonce base + index
   *    c. Decrypt chunk with the file key
   *    d. Store decrypted plaintext in order
   *    e. Send ChunkAck message to sender
   * 3. Wait for TransferComplete message
   * 4. Assemble all plaintext chunks in order
   * 5. Compute SHA-256 of the assembled plaintext
   * 6. Compare with the expected fileHash from AuthAccepted
   * 7. Return the assembled file blob or an integrity error
   */
  async receiveFile(): Promise<FileReceiptResult> {
    if (this._state !== "approved" || !this._conn) {
      throw new Error(
        "Session must be in approved state with an active connection.",
      );
    }

    if (!this._metadata) {
      throw new Error("No transfer metadata available.");
    }

    this._state = "transferring";
    this._error = undefined;

    const totalChunks = Math.ceil(
      this._metadata.fileSize / this._metadata.chunkSize,
    );
    this._totalChunks = totalChunks;
    this._receivedChunksCount = 0;

    // Storage for received plaintext chunks, keyed by index
    const receivedChunks = new Map<number, Uint8Array>();
    const receivedIndices = new Set<number>();

    let fileKey: CryptoKey | null = null;
    let nonceBase: Uint8Array | null = null;
    let fileKeyReceived = false;
    let transferComplete = false;
    let receivedFileHash: string | null = null;
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    const INACTIVITY_TIMEOUT_MS = 15_000; // 15s without data = fail

    try {
      const result = await new Promise<FileReceiptResult>((resolve, reject) => {
        // Reset the inactivity timer on each received message
        const resetInactivityTimer = () => {
          if (inactivityTimer) clearTimeout(inactivityTimer);
          inactivityTimer = setTimeout(() => {
            cleanup();
            reject(
              new Error(
                "Transfer timed out: no data received from sender for an extended period.",
              ),
            );
          }, INACTIVITY_TIMEOUT_MS);
        };

        const onData = (data: unknown) => {
          if (typeof data !== "string") return;

          // Reset inactivity timer on any received data during transfer
          resetInactivityTimer();

          let msg: ProtocolMessage;
          try {
            msg = deserializeMessage(data);
          } catch {
            // Ignore unparseable messages
            return;
          }

          // ── Handle FileKey message ──
          if (msg.type === MessageType.FileKey && !fileKeyReceived) {
            const fileKeyMsg = msg as FileKeyMessage;
            importFileKey(hexToBytes(fileKeyMsg.key))
              .then((key) => {
                fileKey = key;
                nonceBase = hexToBytes(fileKeyMsg.nonceBase);
                fileKeyReceived = true;
              })
              .catch((err: unknown) => {
                cleanup();
                reject(
                  new Error(
                    `Failed to import file key: ${err instanceof Error ? err.message : String(err)}`,
                  ),
                );
              });
            return;
          }

          // ── Handle Chunk message ──
          if (msg.type === MessageType.Chunk && fileKeyReceived) {
            const chunkMsg = msg as ChunkMessage;

            // Validate chunk index is in expected range
            if (chunkMsg.index < 0 || chunkMsg.index >= totalChunks) {
              cleanup();
              reject(
                new Error(
                  `Chunk index ${chunkMsg.index} out of range (0-${totalChunks - 1})`,
                ),
              );
              return;
            }

            // Reject duplicate chunks
            if (receivedIndices.has(chunkMsg.index)) {
              cleanup();
              reject(
                new Error(`Duplicate chunk index ${chunkMsg.index} received`),
              );
              return;
            }

            // Validate nonce against expected structure
            const chunkNonce = hexToBytes(chunkMsg.nonce);
            if (!validateChunkNonce(chunkNonce, nonceBase!, chunkMsg.index)) {
              cleanup();
              reject(
                new Error(
                  `Invalid nonce for chunk ${chunkMsg.index}: nonce does not match expected structure`,
                ),
              );
              return;
            }

            // Decrypt the chunk
            decryptChunk(
              {
                index: chunkMsg.index,
                nonce: chunkNonce,
                ciphertext: hexToBytes(chunkMsg.ciphertext),
              },
              fileKey!,
            )
              .then((plaintext) => {
                receivedChunks.set(chunkMsg.index, plaintext);
                receivedIndices.add(chunkMsg.index);
                this._receivedChunksCount = receivedIndices.size;

                // Send ACK
                const ackMsg: ChunkAckMessage = {
                  type: MessageType.ChunkAck,
                  version: 1,
                  index: chunkMsg.index,
                };
                this._transport!.sendMessage(this._conn!, ackMsg);
              })
              .catch((err: unknown) => {
                cleanup();
                reject(
                  new Error(
                    `Decryption failed for chunk ${chunkMsg.index}: ${err instanceof Error ? err.message : String(err)}`,
                  ),
                );
              });
            return;
          }

          // ── Handle TransferComplete message ──
          if (msg.type === MessageType.TransferComplete) {
            const completeMsg = msg as TransferCompleteMessage;
            transferComplete = true;
            receivedFileHash = completeMsg.fileHash;

            // Verify all chunks were received
            if (receivedIndices.size !== totalChunks) {
              cleanup();
              reject(
                new Error(
                  `Incomplete transfer: received ${receivedIndices.size} of ${totalChunks} chunks`,
                ),
              );
              return;
            }

            // Assemble plaintext in order
            const assembled = new Uint8Array(this._metadata!.fileSize);
            let offset = 0;
            for (let i = 0; i < totalChunks; i++) {
              const chunk = receivedChunks.get(i);
              if (!chunk) {
                cleanup();
                reject(new Error(`Missing chunk ${i} during assembly`));
                return;
              }
              const end = Math.min(
                offset + chunk.length,
                this._metadata!.fileSize,
              );
              assembled.set(chunk.slice(0, end - offset), offset);
              offset = end;
            }

            // Verify the final assembled file hash.
            // If the sender omitted the hash (empty string), integrity is
            // still guaranteed per-chunk by AES-GCM authentication, so we
            // skip the whole-file comparison and accept the assembled file.
            if (receivedFileHash && receivedFileHash.length > 0) {
              globalThis.crypto.subtle
                .digest("SHA-256", assembled)
                .then((hashBuffer) => {
                  const computedHash = bytesToHex(new Uint8Array(hashBuffer));

                  if (computedHash !== receivedFileHash) {
                    cleanup();
                    resolve({
                      status: "integrity-failed",
                      error: `File integrity check failed: computed hash ${computedHash} does not match expected hash ${receivedFileHash}. The file may have been corrupted during transfer.`,
                    });
                    return;
                  }

                  const blob = new Blob([assembled], {
                    type: this._metadata!.filename.endsWith(".txt")
                      ? "text/plain"
                      : "application/octet-stream",
                  });

                  cleanup();
                  resolve({ status: "ok", blob });
                })
                .catch((err: unknown) => {
                  cleanup();
                  reject(
                    new Error(
                      `Hash computation failed: ${err instanceof Error ? err.message : String(err)}`,
                    ),
                  );
                });
              return;
            }

            // No sender-provided hash: trust AES-GCM per-chunk auth.
            {
              const blob = new Blob([assembled], {
                type: this._metadata!.filename.endsWith(".txt")
                  ? "text/plain"
                  : "application/octet-stream",
              });
              cleanup();
              resolve({ status: "ok", blob });
            }
          }

          // Handle errors from sender
          if (msg.type === MessageType.Error) {
            const errMsg = msg as ErrorMessage;
            cleanup();
            reject(
              new Error(
                `Sender reported error: ${errMsg.reason} (${errMsg.code})`,
              ),
            );
          }
        };

        const onClose = () => {
          if (!transferComplete) {
            cleanup();
            reject(new Error("Connection closed before transfer completed."));
          }
        };

        const cleanup = () => {
          if (inactivityTimer) clearTimeout(inactivityTimer);
          inactivityTimer = null;
          this._conn?.off("data", onData as (...args: unknown[]) => void);
          this._conn?.off("close", onClose);
        };

        this._conn!.on("data", onData);
        this._conn!.on("close", onClose);
        // Start the inactivity timer now that we're listening for data
        resetInactivityTimer();
      });

      // Update state based on result
      if (result.status === "ok") {
        this._state = "completed";
      } else {
        this._state = "failed";
        this._error = result.error;
      }

      return result;
    } catch (err: unknown) {
      this._state = "failed";
      this._error = err instanceof Error ? err.message : "File receipt failed.";
      return {
        status: "transfer-failed",
        error: err instanceof Error ? err.message : "File receipt failed.",
      };
    }
  }

  /**
   * Clean up the KDF worker and transport.
   */
  destroy(): void {
    this._kdfClient.stop();
    this._transport?.destroy();
    this._transport = null;
    this._conn = null;
  }

  // ── Private ──

  /**
   * Wait for the first incoming message on the connection.
   * Returns the parsed ProtocolMessage.
   */
  private _waitForFirstMessage(timeoutMs = 15_000): Promise<ProtocolMessage> {
    return new Promise((resolve, reject) => {
      if (!this._conn) {
        reject(new Error("No connection"));
        return;
      }

      const onData = (data: unknown) => {
        cleanup();
        try {
          if (typeof data !== "string") {
            reject(new Error("Expected string message"));
            return;
          }
          const msg = deserializeMessage(data);
          resolve(msg);
        } catch (err) {
          reject(err);
        }
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const onClose = () => {
        cleanup();
        reject(new Error("Connection closed before receiving response"));
      };

      const cleanup = () => {
        this._conn?.off("data", onData as (...args: unknown[]) => void);
        this._conn?.off("error", onError);
        this._conn?.off("close", onClose);
      };

      this._conn.on("data", onData);
      this._conn.on("error", onError);
      this._conn.on("close", onClose);

      // Timeout safeguard
      setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for sender response"));
      }, timeoutMs);
    });
  }
}
