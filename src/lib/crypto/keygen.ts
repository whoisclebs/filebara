/**
 * An ephemeral keypair for session identity.
 */
export interface Keypair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Generate an ephemeral ECDH keypair for the current session.
 *
 * Placeholder — will integrate with SubtleCrypto in a later task.
 */
export async function generateKeypair(): Promise<Keypair> {
  const { subtle } = globalThis.crypto;
  const algorithm = { name: "ECDH", namedCurve: "P-256" };
  const keys = await subtle.generateKey(algorithm, true, [
    "deriveKey",
    "deriveBits",
  ]);
  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };
}
