import { PassThrough, Readable } from 'stream';

export interface IDemuxStream {
  stdout: Readable;
  stderr: Readable;

  onClose(listener: () => void): this;
  onOut(listener: (data: string|Buffer) => void): this;
  onErr(listener: (data: string|Buffer) => void): this;
}

export class DemuxStream implements IDemuxStream {
  stdout: Readable;

  stderr: Readable;

  constructor(protected mainStream: Readable) {
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
  }

  /**
   * Call the given listener when both streams are closed.
   *
   * @param listener The listener to call on 'close' event.
   * @returns Itself for chaining.
   */
  onClose(listener: () => void): this {
    this.mainStream.on('close', listener);

    return this;
  }

  /**
   * Call the given listener when the 'stdout' stream has data.
   *
   * @param listener The listener to call on 'data' event on stdout.
   * @returns Itself for chaining.
   */
  onOut(listener: (data: string|Buffer) => void): this {
    this.stdout.on('data', listener);

    return this;
  }

  /**
   * Call the given listener when the 'stderr' stream has data.
   *
   * @param listener The listener to call on 'data' event on stderr.
   * @returns Itself for chaining.
   */
  onErr(listener: (data: string|Buffer) => void): this {
    this.stderr.on('data', listener);

    return this;
  }
}
