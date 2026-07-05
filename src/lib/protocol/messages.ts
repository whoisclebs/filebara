/**
 * Protocol message type identifiers.
 * All messages in the Filebara transfer protocol are tagged with a `type` field.
 */
export enum MessageType {
  /** Receiver → Sender: proof of password knowledge */
  AuthProof = "auth_proof",
  /** Sender → Receiver: proof accepted, metadata follows */
  AuthAccepted = "auth_accepted",
  /** Sender → Receiver: proof rejected */
  AuthRejected = "auth_rejected",
  /** Receiver → Sender: explicit approval request with identity */
  ApprovalRequest = "approval_request",
  /** Sender → Receiver: approval granted */
  ApprovalGranted = "approval_granted",
  /** Sender → Receiver: approval denied */
  ApprovalDenied = "approval_denied",
  /** Sender → Receiver: file encryption key and nonce base (after approval) */
  FileKey = "file_key",
  /** Sender → Receiver: encrypted file chunk */
  Chunk = "chunk",
  /** Receiver → Sender: chunk acknowledged */
  ChunkAck = "chunk_ack",
  /** Sender → Receiver: transfer complete notification */
  TransferComplete = "transfer_complete",
  /** Either → Other: error or failure signal */
  Error = "error",
}

/**
 * Base protocol message interface.
 */
export interface ProtocolMessage<T extends string = string> {
  type: T;
  version: number;
}

/**
 * A mapping from message type string to its interface.
 */
export interface MessageTypeMap {
  [MessageType.AuthProof]: AuthProofMessage;
  [MessageType.AuthAccepted]: AuthAcceptedMessage;
  [MessageType.AuthRejected]: AuthRejectedMessage;
  [MessageType.ApprovalRequest]: ApprovalRequestMessage;
  [MessageType.ApprovalGranted]: ApprovalGrantedMessage;
  [MessageType.ApprovalDenied]: ApprovalDeniedMessage;
  [MessageType.FileKey]: FileKeyMessage;
  [MessageType.Chunk]: ChunkMessage;
  [MessageType.ChunkAck]: ChunkAckMessage;
  [MessageType.TransferComplete]: TransferCompleteMessage;
  [MessageType.Error]: ErrorMessage;
}

/**
 * Receiver proof of password knowledge.
 * Sent after the receiver derives the auth key from the password.
 */
export interface AuthProofMessage extends ProtocolMessage<MessageType.AuthProof> {
  proof: string;
  senderFingerprint: string;
}

/**
 * Sender accepts password proof and releases metadata.
 */
export interface AuthAcceptedMessage extends ProtocolMessage<MessageType.AuthAccepted> {
  filename: string;
  fileSize: number;
  fileHash: string;
  chunkSize: number;
}

/**
 * Sender rejects password proof.
 */
export interface AuthRejectedMessage extends ProtocolMessage<MessageType.AuthRejected> {
  reason: string;
}

/**
 * Receiver requests approval, carrying their ephemeral public identity.
 */
export interface ApprovalRequestMessage extends ProtocolMessage<MessageType.ApprovalRequest> {
  receiverPublicKey: string;
  receiverFingerprint: string;
}

/**
 * Sender grants approval to the receiver.
 */
export interface ApprovalGrantedMessage extends ProtocolMessage<MessageType.ApprovalGranted> {
  message: string;
}

/**
 * Sender denies the receiver request.
 */
export interface ApprovalDeniedMessage extends ProtocolMessage<MessageType.ApprovalDenied> {
  reason: string;
}

/**
 * Sender shares the file encryption key and nonce base with the receiver.
 * Sent after approval is granted, before any chunks are transmitted.
 */
export interface FileKeyMessage extends ProtocolMessage<MessageType.FileKey> {
  /** Hex-encoded 32-byte AES-256-GCM key */
  key: string;
  /** Hex-encoded 8-byte random nonce prefix for per-chunk nonces */
  nonceBase: string;
}

/**
 * Encrypted file chunk sent from sender to receiver.
 */
export interface ChunkMessage extends ProtocolMessage<MessageType.Chunk> {
  index: number;
  nonce: string; // hex-encoded
  ciphertext: string; // hex-encoded
}

/**
 * Receiver acknowledges receipt of a chunk.
 */
export interface ChunkAckMessage extends ProtocolMessage<MessageType.ChunkAck> {
  index: number;
}

/**
 * Sender notifies receiver that all chunks have been sent.
 */
export interface TransferCompleteMessage extends ProtocolMessage<MessageType.TransferComplete> {
  fileHash: string;
}

/**
 * Error signal that can be sent by either peer.
 */
export interface ErrorMessage extends ProtocolMessage<MessageType.Error> {
  reason: string;
  code: string;
}
