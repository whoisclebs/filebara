/**
 * Transfer lifecycle states shared by sender and receiver UI.
 */
export type TransferState =
  | "preparing"
  | "connecting"
  | "validating"
  | "awaiting-approval"
  | "transferring"
  | "verifying"
  | "completed"
  | "failed";

/**
 * Standardized failure categories.
 */
export type FailureKind =
  | "sender-offline"
  | "wrong-password"
  | "denied"
  | "connection-failed"
  | "transfer-interrupted"
  | "integrity-failed"
  | "unknown";

/**
 * Recovery guidance for each failure kind.
 * `retryable` indicates whether the user can try again within the current session.
 * `requiresNewTransfer` indicates a new transfer must be created.
 */
export interface FailureRecovery {
  retryable: boolean;
  requiresNewTransfer: boolean;
  guidance: string;
}

export const FAILURE_RECOVERY: Record<FailureKind, FailureRecovery> = {
  "sender-offline": {
    retryable: false,
    requiresNewTransfer: true,
    guidance:
      "The sender tab is no longer available. The sender needs to create a new transfer and share a new link.",
  },
  "wrong-password": {
    retryable: true,
    requiresNewTransfer: false,
    guidance:
      "Check the password and try again. The password was set by the sender when creating the transfer.",
  },
  denied: {
    retryable: false,
    requiresNewTransfer: true,
    guidance:
      "The sender has denied this request. A new transfer link is required.",
  },
  "connection-failed": {
    retryable: true,
    requiresNewTransfer: false,
    guidance:
      "You can try again. If the problem persists, both parties may need to switch networks or the sender can create a new transfer.",
  },
  "transfer-interrupted": {
    retryable: false,
    requiresNewTransfer: true,
    guidance:
      "The transfer was interrupted and cannot continue. The sender needs to create a new transfer.",
  },
  "integrity-failed": {
    retryable: false,
    requiresNewTransfer: true,
    guidance:
      "The file integrity could not be verified. Do not trust the received file. The sender should create a new transfer.",
  },
  unknown: {
    retryable: false,
    requiresNewTransfer: true,
    guidance:
      "An unexpected error occurred. Try again or ask the sender to create a new transfer.",
  },
};

/**
 * Determine the FailureKind from an error message or context string.
 * Falls back to "unknown" if no pattern matches.
 */
export function classifyFailure(
  errorMessage: string,
  context?: { passwordRejected?: boolean; senderDenied?: boolean },
): FailureKind {
  if (context?.passwordRejected) return "wrong-password";
  if (context?.senderDenied) return "denied";

  const msg = errorMessage.toLowerCase();
  if (
    msg.includes("offline") ||
    msg.includes("sender went") ||
    msg.includes("sender not available")
  ) {
    return "sender-offline";
  }
  if (
    msg.includes("password") ||
    msg.includes("proof") ||
    msg.includes("auth") ||
    msg.includes("incorrect")
  ) {
    return "wrong-password";
  }
  if (
    msg.includes("denied") ||
    msg.includes("declined") ||
    msg.includes("rejected")
  ) {
    return "denied";
  }
  if (
    msg.includes("connect") ||
    msg.includes("connection") ||
    msg.includes("peer") ||
    msg.includes("transport")
  ) {
    return "connection-failed";
  }
  if (
    msg.includes("interrupted") ||
    msg.includes("incomplete") ||
    msg.includes("connection closed") ||
    msg.includes("timed out")
  ) {
    return "transfer-interrupted";
  }
  if (
    msg.includes("integrity") ||
    msg.includes("hash") ||
    msg.includes("corrupt") ||
    msg.includes("verification failed")
  ) {
    return "integrity-failed";
  }
  return "unknown";
}
