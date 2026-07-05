import { generateKeypair, type Keypair } from "./keygen.js";
import { computeFingerprint } from "./utils.js";

export { generateReceiverIdentity, computeVerificationCode };

/**
 * An ephemeral receiver identity for a file transfer session.
 */
export interface ReceiverIdentity {
  keypair: Keypair;
  fingerprint: string;
}

/**
 * Generate an ephemeral receiver identity (ECDH keypair + fingerprint).
 */
async function generateReceiverIdentity(): Promise<ReceiverIdentity> {
  const keypair = await generateKeypair();
  const fingerprint = await computeFingerprint(keypair.publicKey);
  return { keypair, fingerprint };
}

/**
 * Derive a shared short verification code from the auth key and receiver fingerprint.
 *
 * Both sender and receiver can compute this independently. The code is
 * intended to be compared over a side channel (e.g., verbally or by
 * messaging) to confirm the correct peer is connected.
 *
 * @param authKey - 32-byte auth key derived from Argon2id
 * @param receiverFingerprint - hex-encoded SHA-256 of receiver's public key
 * @returns A short hex string (6 characters = 24 bits)
 */
async function computeVerificationCode(
  authKey: Uint8Array,
  receiverFingerprint: string,
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
    `filebara-verification-code-v1:${receiverFingerprint}`,
  );

  const signature = await globalThis.crypto.subtle.sign("HMAC", hmacKey, data);
  const hash = new Uint8Array(signature);

  // Return first 3 bytes (6 hex chars) as a short verification code
  return Array.from(hash.slice(0, 3))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
