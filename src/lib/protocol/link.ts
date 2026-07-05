/**
 * Parsed components of a receiver transfer link.
 *
 * Expected shape:
 *   /f/<file_id>#salt=<salt>&p=<params>&fp=<fingerprint>&pv=<protocol_version>
 */
export interface TransferLinkParams {
  fileId: string;
  salt: string;
  kdfParams: string;
  senderFingerprint: string;
  protocolVersion: string;
}

/**
 * Parse a receiver transfer URL into its components.
 * Returns null if the URL does not match the expected shape.
 */
export function parseTransferLink(url: string): TransferLinkParams | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/^\/f\/([^/]+)$/);
    if (!match) return null;

    const fileId = match[1];

    // Validate fileId is a 64-char hex string (32 random bytes encoded as hex).
    // This prevents malformed or nonsensical link paths from proceeding.
    if (!/^[0-9a-f]{64}$/i.test(fileId)) return null;

    const hash = u.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);

    const salt = params.get("salt");
    const kdfParams = params.get("p");
    const senderFingerprint = params.get("fp");
    const protocolVersion = params.get("pv");

    if (!salt || !kdfParams || !senderFingerprint || !protocolVersion)
      return null;

    return { fileId, salt, kdfParams, senderFingerprint, protocolVersion };
  } catch {
    return null;
  }
}

/**
 * Build a shareable transfer link string from its components.
 */
export function buildTransferLink(params: TransferLinkParams): string {
  const hash = new URLSearchParams({
    salt: params.salt,
    p: params.kdfParams,
    fp: params.senderFingerprint,
    pv: params.protocolVersion,
  }).toString();

  return `/f/${params.fileId}#${hash}`;
}
