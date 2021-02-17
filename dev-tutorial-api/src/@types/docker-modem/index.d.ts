declare module 'docker-modem' {
  interface Modem {
    followProgress(
      stream: NodeJS.ReadableStream,
      onFinished: (error: Error, output: unknown[]) => void,
      onProgress?: (error: Error, output: unknown) => void
    );

    demuxStream(stream: NodeJS.ReadableStream, stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream);
  }
}
