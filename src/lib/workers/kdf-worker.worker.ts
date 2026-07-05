/**
 * Web Worker entry point for Argon2id derivation.
 *
 * This file is loaded as a separate worker entry by Vite. It imports
 * hash-wasm directly in the worker context so the main thread is never
 * blocked during KDF computation.
 *
 * Messages:
 *   { type: "derive_key", password, salt, params } → Request
 *   { type: "derive_key_result", key, error? }     → Response
 */

import { argon2id } from "hash-wasm";
import type { Argon2idParams } from "$lib/kdf/argon2id.js";

interface DeriveKeyRequest {
  type: "derive_key";
  password: string;
  salt: Uint8Array;
  params: Argon2idParams;
}

type WorkerRequest = DeriveKeyRequest;

interface DeriveKeyResponse {
  type: "derive_key_result";
  key: Uint8Array;
  error?: string;
}

type WorkerResponse = DeriveKeyResponse;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  if (msg.type === "derive_key") {
    try {
      const result = await argon2id({
        password: msg.password,
        salt: msg.salt,
        iterations: msg.params.timeCost,
        parallelism: msg.params.parallelism,
        memorySize: msg.params.memoryCost,
        hashLength: msg.params.outputLength,
        outputType: "binary",
      });

      const response: DeriveKeyResponse = {
        type: "derive_key_result",
        key: result,
      };

      self.postMessage(response, { transfer: [result.buffer] });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown worker error";

      const response: DeriveKeyResponse = {
        type: "derive_key_result",
        key: new Uint8Array(0),
        error: errorMessage,
      };

      self.postMessage(response);
    }
  }
};
