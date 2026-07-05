/**
 * An encrypted chunk with its associated nonce.
 */
export interface EncryptedChunk {
  index: number;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

// AES-GCM nonce is 12 bytes (96 bits).
// We use an 8-byte random prefix + 4-byte big-endian chunk index.
const NONCE_BASE_LENGTH = 8;
const NONCE_COUNTER_LENGTH = 4;
const NONCE_LENGTH = 12;

/**
 * Generate a random nonce base for a file transfer.
 *
 * The nonce base is an 8-byte random prefix that, combined with a
 * 4-byte big-endian chunk index, produces a unique 12-byte nonce
 * for each chunk under the same file key.
 */
export function generateNonceBase(): Uint8Array {
  const buf = new Uint8Array(new ArrayBuffer(NONCE_BASE_LENGTH));
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

/**
 * Build a 12-byte AES-GCM nonce from the file-scoped base and chunk index.
 *
 * Layout: [ 8 bytes random prefix | 4 bytes big-endian index ]
 *
 * @param nonceBase - 8-byte random prefix for the file
 * @param index - Chunk index (0-based, monotonic)
 * @returns 12-byte nonce suitable for AES-GCM
 */
export function buildNonce(nonceBase: Uint8Array, index: number): Uint8Array {
  if (nonceBase.length !== NONCE_BASE_LENGTH) {
    throw new Error(
      `nonceBase must be ${NONCE_BASE_LENGTH} bytes, got ${nonceBase.length}`,
    );
  }
  if (index < 0 || index > 0xffffffff) {
    throw new Error(`Chunk index out of range: ${index}`);
  }

  const nonce = new Uint8Array(new ArrayBuffer(NONCE_LENGTH));
  nonce.set(nonceBase, 0);

  // Big-endian 4-byte counter
  nonce[NONCE_BASE_LENGTH] = (index >>> 24) & 0xff;
  nonce[NONCE_BASE_LENGTH + 1] = (index >>> 16) & 0xff;
  nonce[NONCE_BASE_LENGTH + 2] = (index >>> 8) & 0xff;
  nonce[NONCE_BASE_LENGTH + 3] = index & 0xff;

  return nonce;
}

/**
 * Generate a 256-bit AES-GCM key for file payload encryption.
 *
 * The key is exportable so it can be sent to the receiver over the
 * already-encrypted peer data channel.
 */
export async function generateFileKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

/**
 * Export an AES-GCM CryptoKey to raw bytes (ArrayBuffer).
 */
export async function exportFileKey(key: CryptoKey): Promise<ArrayBuffer> {
  return globalThis.crypto.subtle.exportKey("raw", key);
}

/**
 * Import raw bytes as an AES-GCM CryptoKey for decryption.
 *
 * Accepts a Uint8Array containing the 32-byte raw key material.
 * Creates a compatible ArrayBuffer copy for the Web Crypto API.
 */
export async function importFileKey(raw: Uint8Array): Promise<CryptoKey> {
  const buffer = new ArrayBuffer(raw.length);
  new Uint8Array(buffer).set(raw);
  return globalThis.crypto.subtle.importKey(
    "raw",
    buffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

/**
 * Create a proper ArrayBuffer-backed copy of a Uint8Array for
 * compatibility with Web Crypto API type expectations.
 *
 * Newer TypeScript definitions require BufferSource to be backed by
 * ArrayBuffer (not ArrayBufferLike), so we make a safe copy.
 */
function toCryptoBuffer(data: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(data.length);
  new Uint8Array(buf).set(data);
  return buf;
}

/**
 * Encrypt a single file chunk using AES-GCM.
 *
 * The nonce is built from the file-scoped nonce base and the chunk index,
 * guaranteeing uniqueness under the same file key.
 *
 * @param plaintext - Raw chunk bytes to encrypt
 * @param index - Monotonic chunk index (0-based)
 * @param key - AES-GCM 256-bit file key
 * @param nonceBase - 8-byte random prefix for the file
 * @returns EncryptedChunk with index, nonce, and ciphertext
 */
export async function encryptChunk(
  plaintext: Uint8Array,
  index: number,
  key: CryptoKey,
  nonceBase: Uint8Array,
): Promise<EncryptedChunk> {
  const nonce = buildNonce(nonceBase, index);

  // Copy to ArrayBuffer-backed buffers for Web Crypto API compatibility
  const nonceBuf = toCryptoBuffer(nonce);
  const plainBuf = toCryptoBuffer(plaintext);

  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonceBuf },
    key,
    plainBuf,
  );

  return { index, nonce, ciphertext: new Uint8Array(encrypted) };
}

/**
 * Decrypt a single encrypted chunk using AES-GCM.
 *
 * Uses the nonce embedded in the chunk (the receiver has already
 * validated it matches expectations).
 *
 * @param chunk - Encrypted chunk with index, nonce, and ciphertext
 * @param key - AES-GCM 256-bit file key
 * @returns Decrypted plaintext bytes
 */
export async function decryptChunk(
  chunk: EncryptedChunk,
  key: CryptoKey,
): Promise<Uint8Array> {
  // Copy to ArrayBuffer-backed buffers for Web Crypto API compatibility
  const nonceBuf = toCryptoBuffer(chunk.nonce);
  const cipherBuf = toCryptoBuffer(chunk.ciphertext);

  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonceBuf },
    key,
    cipherBuf,
  );

  return new Uint8Array(decrypted);
}

/**
 * Validate that a chunk's nonce matches expectations based on the
 * file-scoped nonce base and chunk index.
 *
 * Returns true if the nonce is consistent. Callers should reject
 * chunks with invalid nonces before attempting decryption.
 */
export function validateChunkNonce(
  nonce: Uint8Array,
  expectedNonceBase: Uint8Array,
  index: number,
): boolean {
  if (nonce.length !== NONCE_LENGTH) return false;
  if (expectedNonceBase.length !== NONCE_BASE_LENGTH) return false;

  // Check the first 8 bytes match the nonce base
  for (let i = 0; i < NONCE_BASE_LENGTH; i++) {
    if (nonce[i] !== expectedNonceBase[i]) return false;
  }

  // Check the last 4 bytes match the big-endian index
  const expectedIndexBytes = new Uint8Array(
    new ArrayBuffer(NONCE_COUNTER_LENGTH),
  );
  expectedIndexBytes[0] = (index >>> 24) & 0xff;
  expectedIndexBytes[1] = (index >>> 16) & 0xff;
  expectedIndexBytes[2] = (index >>> 8) & 0xff;
  expectedIndexBytes[3] = index & 0xff;

  for (let i = 0; i < NONCE_COUNTER_LENGTH; i++) {
    if (nonce[NONCE_BASE_LENGTH + i] !== expectedIndexBytes[i]) return false;
  }

  return true;
}
