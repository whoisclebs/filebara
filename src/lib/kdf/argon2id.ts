import { argon2id } from "hash-wasm";

/**
 * Argon2id KDF parameters.
 */
export interface Argon2idParams {
  memoryCost: number; // KiB
  timeCost: number;
  parallelism: number;
  outputLength: number; // bytes
}

/**
 * Result of a KDF derivation.
 */
export interface KdfResult {
  key: Uint8Array;
  salt: string;
}

/**
 * Default Argon2id profile for the MVP.
 * Calibrated conservatively for desktop and mobile browsers.
 */
export const DEFAULT_ARGON2ID_PARAMS: Argon2idParams = {
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
  outputLength: 32,
};

/**
 * Derive key material using Argon2id via hash-wasm.
 *
 * This is a direct async call that can be used from a Web Worker
 * (imported there directly) or from the main thread when the sender
 * needs to derive the same material for proof validation.
 *
 * @param password - The password string
 * @param salt - Salt as hex string or Uint8Array
 * @param params - Argon2id parameters (defaults used if omitted)
 * @returns Derived key as Uint8Array
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array | string,
  params?: Partial<Argon2idParams>,
): Promise<KdfResult> {
  const merged: Argon2idParams = {
    ...DEFAULT_ARGON2ID_PARAMS,
    ...params,
  };

  const saltBytes: Uint8Array =
    typeof salt === "string" ? hexToBytes(salt) : salt;

  const result = await argon2id({
    password,
    salt: saltBytes,
    iterations: merged.timeCost,
    parallelism: merged.parallelism,
    memorySize: merged.memoryCost,
    hashLength: merged.outputLength,
    outputType: "binary",
  });

  return {
    key: result,
    salt: typeof salt === "string" ? salt : bytesToHex(saltBytes),
  };
}

// ── Small internal hex helpers to avoid circular crypto dependency ──

function hexToBytes(hex: string): Uint8Array {
  const len = hex.length;
  if (len % 2 !== 0) throw new Error("Hex string must have an even length");
  const out = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
