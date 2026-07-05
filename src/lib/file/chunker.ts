/**
 * A single file chunk read from the selected file.
 */
export interface FileChunk {
  index: number;
  data: Uint8Array;
}

/**
 * Reads a file incrementally in fixed-size chunks.
 *
 * Placeholder — will be implemented with File.slice() streaming in a later task.
 */
export class FileChunker {
  private _file: File;
  private _chunkSize: number;

  constructor(file: File, chunkSize: number = 262144 /* 256 KiB */) {
    this._file = file;
    this._chunkSize = chunkSize;
  }

  get totalChunks(): number {
    return Math.ceil(this._file.size / this._chunkSize);
  }

  get file(): File {
    return this._file;
  }

  get chunkSize(): number {
    return this._chunkSize;
  }

  /**
   * Read the chunk at the given index.
   */
  async readChunk(index: number): Promise<FileChunk> {
    const start = index * this._chunkSize;
    const end = Math.min(start + this._chunkSize, this._file.size);
    const blob = this._file.slice(start, end);
    const data = new Uint8Array(await blob.arrayBuffer());
    return { index, data };
  }
}
