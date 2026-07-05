import { deriveKey, type Argon2idParams } from "$lib/kdf/argon2id.js";
import { bytesToHex } from "$lib/crypto/utils.js";

/**
 * Derive the 32-byte authorization key from the password and session salt.
 *
 * Both sender and receiver call this function to obtain the same key
 * material, which is then used to generate and validate the password proof.
 *
 * @param password - The transfer password
 * @param salt - Session salt as hex string or Uint8Array
 * @param params - Argon2id parameters from the transfer link
 * @returns 32-byte auth key
 */
export async function deriveAuthKey(
  password: string,
  salt: Uint8Array | string,
  params?: Partial<Argon2idParams>,
): Promise<Uint8Array> {
  const result = await deriveKey(password, salt, params);
  return result.key;
}

/**
 * Compute an HMAC-SHA256 proof that the caller knows the password.
 *
 * The proof binds knowledge of the auth key to the specific session
 * identified by `fileId` and `senderFingerprint`, preventing replay
 * across different sessions.
 *
 * @param authKey - 32-byte key derived from Argon2id
 * @param fileId - The session file identifier (hex)
 * @param senderFingerprint - Sender's public key fingerprint (hex)
 * @returns Hex-encoded HMAC-SHA256 proof string
 */
export async function computeAuthProof(
  authKey: Uint8Array,
  fileId: string,
  senderFingerprint: string,
): Promise<string> {
  const keyCopy = new Uint8Array(authKey);
  const hmacKey = await globalThis.crypto.subtle.importKey(
    "raw",
    keyCopy,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const data = new TextEncoder().encode(
    `filebara-auth-proof-v1:${fileId}:${senderFingerprint}`,
  );

  const signature = await globalThis.crypto.subtle.sign("HMAC", hmacKey, data);

  return bytesToHex(new Uint8Array(signature));
}

/**
 * Validate a receiver's auth proof against the expected value.
 *
 * The sender derives the same auth key (they know the password) and
 * computes the expected proof. If the receiver's proof matches, the
 * password is correct and metadata can be released.
 *
 * @param authKey - 32-byte key derived from Argon2id (by the sender)
 * @param fileId - The session file identifier (hex)
 * @param senderFingerprint - Sender's public key fingerprint (hex)
 * @param proof - The proof received from the receiver
 * @returns true if the proof is valid
 */
export async function validateAuthProof(
  authKey: Uint8Array,
  fileId: string,
  senderFingerprint: string,
  proof: string,
): Promise<boolean> {
  const expected = await computeAuthProof(authKey, fileId, senderFingerprint);

  // Constant-time comparison to prevent timing side-channels
  if (expected.length !== proof.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ proof.charCodeAt(i);
  }
  return diff === 0;
}
