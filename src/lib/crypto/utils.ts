/**
 * Export a CryptoKey's raw public key bytes as a hex string.
 */
export async function publicKeyToHex(publicKey: CryptoKey): Promise<string> {
  const raw = await globalThis.crypto.subtle.exportKey("raw", publicKey);
  return bytesToHex(new Uint8Array(raw));
}

/**
 * Generate cryptographically random bytes.
 */
export function randomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

/**
 * Convert a byte array to a lowercase hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a 256-bit (32-byte) file identifier as a hex string.
 * Used to uniquely identify a transfer session.
 */
export function generateFileId(): string {
  return bytesToHex(randomBytes(32));
}

/**
 * Generate a 128-bit (16-byte) salt as a hex string.
 * Used as the session salt for KDF derivation.
 */
export function generateSalt(): string {
  return bytesToHex(randomBytes(16));
}

/**
 * Convert a lowercase hex string to a byte array.
 */
export function hexToBytes(hex: string): Uint8Array {
  const len = hex.length;
  if (len % 2 !== 0) throw new Error("Hex string must have an even length");
  const out = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

/**
 * Compute the sender fingerprint as the SHA-256 hash of the raw public key bytes.
 * The fingerprint is used by the receiver to verify they are connecting to the
 * correct sender session.
 */
export async function computeFingerprint(
  publicKey: CryptoKey,
): Promise<string> {
  const raw = await globalThis.crypto.subtle.exportKey("raw", publicKey);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", raw);
  return bytesToHex(new Uint8Array(hash));
}
