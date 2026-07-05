import type { Argon2idParams } from "$lib/kdf/argon2id.js";

/**
 * Request message sent to the KDF worker.
 */
export interface KdfWorkerRequest {
  type: "derive_key";
  password: string;
  salt: Uint8Array;
  params: Argon2idParams;
}

/**
 * Response message from the KDF worker.
 */
export interface KdfWorkerResponse {
  type: "derive_key_result";
  key: Uint8Array;
  error?: string;
}

/**
 * Client-side wrapper around the KDF Web Worker.
 *
 * Spawns a dedicated worker that runs Argon2id via hash-wasm off the
 * main thread, keeping the UI responsive during derivation.
 */
export class KdfWorkerClient {
  private _worker: Worker | null = null;
  private _nextId = 0;
  private _pending = new Map<
    number,
    { resolve: (res: KdfWorkerResponse) => void; reject: (err: Error) => void }
  >();

  /**
   * Whether the worker has been started.
   */
  get started(): boolean {
    return this._worker !== null;
  }

  /**
   * Spawn the KDF worker.
   *
   * Uses Vite's `new Worker(new URL(...))` pattern so the worker script
   * is built as a separate entry point automatically.
   */
  start(): void {
    if (this._worker) return;

    this._worker = new Worker(
      new URL("./kdf-worker.worker.ts", import.meta.url),
      { type: "module" },
    );

    this._worker.onmessage = (event: MessageEvent<KdfWorkerResponse>) => {
      const msg = event.data;
      // For simplicity, we expect one pending request at a time
      // so we resolve the single pending promise.
      for (const [, pending] of this._pending) {
        pending.resolve(msg);
      }
      this._pending.clear();
    };

    this._worker.onerror = (event: ErrorEvent) => {
      for (const [, pending] of this._pending) {
        pending.reject(new Error(event.message ?? "Worker error"));
      }
      this._pending.clear();
    };
  }

  /**
   * Send a derivation request to the worker and return the result.
   */
  async deriveKey(request: KdfWorkerRequest): Promise<KdfWorkerResponse> {
    if (!this._worker) {
      throw new Error("KdfWorkerClient not started. Call start() first.");
    }

    return new Promise<KdfWorkerResponse>((resolve, reject) => {
      const id = this._nextId++;
      this._pending.set(id, { resolve, reject });

      const transferables: Transferable[] = [request.salt.buffer];

      this._worker!.postMessage({ ...request, _id: id }, transferables);
    });
  }

  /**
   * Terminate the worker and release resources.
   */
  stop(): void {
    this._worker?.terminate();
    this._worker = null;
    this._pending.clear();
  }
}
