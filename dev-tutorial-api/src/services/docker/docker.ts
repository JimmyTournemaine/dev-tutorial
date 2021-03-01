import { Readable, Writable } from 'stream';
// dockerode peer dependency typed in @types
// eslint-disable-next-line import/no-extraneous-dependencies
import { Modem } from 'docker-modem';
import * as Docker from 'dockerode';
import * as debug from 'debug';
import * as tar from 'tar-stream';
import * as path from 'path';
import * as tmp from 'tmp';
import * as fs from 'fs';
import { DockerAttachedHandler } from './handler';
import { DemuxStream } from './stream';
import { DockerCache, StateChangedEvent } from './cache';

const log = debug('app:docker');

export interface IDockerService {
  findContainer(tutoId: string): Promise<Docker.Container>;
  findContainerIfExists(tutoId: string): Promise<Docker.Container>;
  isContainerReady(tutoId: string): boolean;
  run(tutoId: string): Promise<Docker.Container>;
  attach(tutoId: string): Promise<DockerAttachedHandler>;
  exec(tutoId: string, command: string): Promise<DemuxStream>;
  destroy(tutoId: string): Promise<void>;
  listenStatusChanged(listener: (change: StateChangedEvent) => void): void;
}

/**
 * Docker service
 */
export class DockerService implements IDockerService {
  private docker: Docker;

  private cache: DockerCache;

  static instance: DockerService;

  /**
   * Setup the docker API.
   *
   * @param {any} dockerOptions Docker setup
   */
  private constructor(dockerOptions: Docker.DockerOptions) {
    this.docker = new Docker(dockerOptions);
    this.cache = new DockerCache();
  }

  /**
   * Get the singleton instance. Options are accepted only for the first call (instanciation).
   *
   * @returns The singleton service
   */
  static getInstance(): DockerService {
    if (!this.instance) {
      throw new Error('Instance not connected. Use `DockerService.connect(dockerOptions?: any)` first');
    }
    return this.instance;
  }

  /**
   * Connect the singleton instance to the docker daemon.
   *
   * @param dockerOptions Options of docker API service
   * @returns The connected service
   */
  static connect(dockerOptions?: Docker.DockerOptions): DockerService {
    this.instance = new DockerService(dockerOptions);
    return this.instance;
  }

  /**
   * Disconnect the service
   */
  static disconnect(): void {
    this.instance = undefined;
  }

  /**
   * Find the tutorial container.
   *
   * If the container does not exists, the promise will be rejected.
   *
   * @param {string} tutoId The tutorial identifier.
   * @returns {Promise} The container if it is found
   */
  public async findContainer(tutoId: string): Promise<Docker.Container> {
    return this.findContainerIfExists(tutoId)
      .then((container: Docker.Container) => new Promise<Docker.Container>((resolve, reject) => {
        if (!container) {
          reject(new Error(`Container for '${tutoId}' does not exist.`));
        }
        resolve(container);
      }));
  }

  /**
   * Find the tutorial container.
   *
   * If the container does not exists, return null.
   *
   * @param {string} tutoId The tutorial identifier.
   * @returns {Promise} The container if it is found
   */
  public async findContainerIfExists(tutoId: string): Promise<Docker.Container> {
    // Use cache
    const cached = this.cache.container(tutoId);
    if (cached) {
      return cached;
    }

    // Use Docker API
    const containers = await this.docker.listContainers({ all: true });
    const match = containers.find((value: Docker.ContainerInfo) => value.Names.indexOf(`/${tutoId}`) !== -1);
    if (match) {
      log(`${tutoId}: container missing from cache`);
      return this.docker.getContainer(match.Id);
    }

    return null;
  }

  /**
   * The container could be running but in a stop-remove-rebuild-restart state
   *
   * @param tutoId The tutorial identifier
   * @returns A boolean indicates if the container is ready
   */
  public isContainerReady(tutoId: string): boolean {
    return this.cache.state(tutoId) === 'container started';
  }

  /**
   * Build the docker image of the tutorial and run a container.
   *
   * @param {string} tutoId The tutorial identifier
   * @returns The started container.
   */
  async run(tutoId: string): Promise<Docker.Container> {
    // Check for existing container
    await this.destroy(tutoId);

    // Build the image
    const stream = await this.docker.buildImage({ context: `tutorials/${tutoId}`, src: ['Dockerfile'] }, { t: tutoId });
    await new Promise<void>((resolve, reject) => {
      (this.docker.modem as Modem).followProgress(stream, (err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    this.cache.update(tutoId, 'image built');

    // Create the container
    const container = await this.docker.createContainer({
      Image: tutoId, name: tutoId, AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true, OpenStdin: false, StdinOnce: false,
    });
    this.cache.update(tutoId, 'container created', container);

    // Start the container
    await container.start();
    this.cache.update(tutoId, 'container started');

    return container;
  }

  /**
   * Attach a socket to the container shell.
   *
   * @param {string} tutoId The tutoriel identifier
   * @returns The handler of the new attached docker container.
   */
  attach(tutoId: string): Promise<DockerAttachedHandler> {
    return this.findContainer(tutoId)
      .then((container) => container.exec({
        Tty: true,
        Cmd: ['/bin/bash'],
        Env: [
          'PROMPT_COMMAND=RETRN_VAL=$?;echo "ttylog#$(whoami)#$(history 1 | sed "s/^[ ]*[0-9]\\+[ ]*//" )#$RETRN_VAL#$(pwd)"',
        ],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
      }))
      .then((exec) => exec.start({
        Tty: true,
        stdin: true,
        hijack: true,
      }).then((stream: Writable) => new DockerAttachedHandler(exec, stream)));
  }

  /**
   * Execute a bash command in the given container
   *
   * @param {string} tutoId The tutoriel identifier
   * @param command The bash command to execute.
   * @returns {Readable} A readable stream to the command stout|stderr
   */
  async exec(tutoId: string, command: string): Promise<DemuxStream> {
    return this.findContainer(tutoId)
      .then((container) => container.exec({
        Cmd: ['/bin/bash', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
      }))
      .then((exec: Docker.Exec) => {
        log(`${tutoId}: exec '${command.replace('%', '%%')}'`);
        return exec.start({});
      })
      .then((stream: Readable) => {
        const demux = new DemuxStream(stream);
        if ('demuxStream' in this.docker.modem) {
          (this.docker.modem as Modem).demuxStream(stream, demux.stdout, demux.stderr);
        }
        return demux;
      });
  }

  /**
   * Write a file in the tutorial docker container.
   *
   * @param tutoId The tutorial identifier.
   * @param filePath The path of the file to write.
   * @param fileContentStream The file content stream to write.
   * @returns A readable stream to get the file content.
   */
  async writeFile(tutoId: string, filePath: string, fileContentStream: Readable): Promise<void> {
    return new Promise((resolve, reject) => {
      const tmpFile = tmp.fileSync();
      const ws = fs.createWriteStream(tmpFile.name);
      let fileContentLength = 0;
      ws.once('close', () => {
        // pack
        const pack = tar.pack();
        const entry = pack.entry({ name: path.basename(filePath), size: fileContentLength }, (err) => {
          if (err) { reject(err); }
          pack.finalize();

          DockerService.getInstance().findContainer(tutoId)
            .then((container: Docker.Container) => {
              // Write tar in the container for extraction
              log(`${tutoId}: writing ${filePath}`);
              return container.putArchive(pack, { path: path.dirname(filePath) }, (e: Error) => {
                if (e) {
                  reject(e);
                } else {
                  resolve();
                }
              });
            })
            .catch((error: Error) => {
              reject(error);
            });
        });
        fs.createReadStream(tmpFile.name).pipe(entry);
      });

      fileContentStream.pipe(ws);
      fileContentStream.on('data', (chunk: Buffer | string) => { fileContentLength += chunk.length; });
    });
  }

  /**
   * Stop and remove the tutorial container
   *
   * @param {string} tutoId The tutorial identifier
   */
  async destroy(tutoId: string): Promise<void> {
    this.cache.update(tutoId, 'destroying');
    const container = await this.findContainerIfExists(tutoId);

    if (container) {
      const inspect = await container.inspect();

      if (inspect.State.Running) {
        await container.stop();
        this.cache.update(tutoId, 'container stopped');
      }

      await container.remove();
      this.cache.remove(tutoId);
    }
  }

  /**
   * Listen docker items state changes.
   *
   * @param listener The status listener
   */
  listenStatusChanged(listener: (change: StateChangedEvent) => void): void {
    this.cache.listen(listener);
  }
}
