import { PassThrough } from 'stream';
import { DemuxStream } from '../services/docker/stream';

export class PassThroughDemuxStream extends DemuxStream {
  constructor(mainStream: PassThrough) {
    super(mainStream);

    const stdout = new PassThrough();
    const stderr = new PassThrough();

    this.mainStream
      .pipe(stdout)
      .on('end', () => {
        stdout.end();
        stderr.end();
      });

    this.stdout = stdout;
    this.stderr = stderr;
  }

  /**
   * @override
   */
  onClose(listener: () => void): this {
    this.mainStream.on('finish', listener);

    return this;
  }
}
