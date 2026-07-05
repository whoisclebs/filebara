/**
 * Compute a SHA-256 hash of a file's contents.
 *
 * Placeholder — will be implemented with SubtleCrypto in a later task.
 */
export class FileHasher {
  /**
   * Compute the SHA-256 hash of the given file.
   * Returns the hash as a hex-encoded string.
   */
  static async hash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}
