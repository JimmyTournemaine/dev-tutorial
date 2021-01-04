import { EventEmitter } from 'events';
import { PassThrough, Readable, Writable } from 'stream';
import * as Docker from 'dockerode';
import * as debug from 'debug';
import * as tar from 'tar-stream';
import * as path from 'path';
import * as tmp from 'tmp';
import * as fs from 'fs';

const log = debug('app:docker');
const logStream = debug('app:docker-stream');

type CacheItemState = 'undefined' | 'image built' | 'container created' | 'container started' | 'container stopped' | 'destroying';

class DockerCacheItem {
  container?: any;
  state: CacheItemState = 'undefined';
}

class DockerCache {
  cache: Map<string, DockerCacheItem>;

  constructor() {
    this.cache = new Map();
  }

  update(tutoId: string, state: Exclude<CacheItemState, 'container created'>): void;
  update(tutoId: string, state: 'container created', container: any): void;

  /**
   * Update the state of the image/container for the given tutorial.
   * 
   * If the given state is 'container-created', the container has to be provided.
   * 
   * @param tutoId The tutorial identifier.
   * @param state he image/container state.
   * @param container The container if it has just been create.
   */
  update(tutoId: string, state: CacheItemState, container?: any): void {
    if (this.cache.has(tutoId)) {
      this.cache.get(tutoId).state = state;
      if (container) {
        this.cache.get(tutoId).container = container;
      }
    } else {
      this.cache.set(tutoId, { state, container });
    }
    log(`${tutoId}: ${state}`);
  }

  remove(tutoId: string): boolean {
    log(`${tutoId}: container removed`);

    return this.cache.delete(tutoId);
  }

  state(tutoId: string): CacheItemState {
    return this.cache.has(tutoId) ? this.cache.get(tutoId).state : undefined;
  }
  container(tutoId: string): any {
    return this.cache.has(tutoId) ? this.cache.get(tutoId).container : undefined;
  }
}

export interface TtyLog {
  user: string;
  cmd: string;
  exitCode: number;
  workdir: string;
}

export interface IDemuxStream {
  stdout: Readable;
  stderr: Readable;

  onClose(listener: () => void): this;
  onOut(listener: (data: any) => void): this;
  onErr(listener: (data: any) => void): this;
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
   * @param event Close event
   * @param listener Listener to call
   */
  onClose(listener: () => void): this {
    this.mainStream.on('close', listener);

    return this;
  }
  onOut(listener: (data: any) => void): this {
    this.stdout.on('data', listener);

    return this;
  }
  onErr(listener: (data: any) => void): this {
    this.stderr.on('data', listener);

    return this;
  }
}

/**
 * Docker attached exec handler
 * 
 * Use write to send data
 * Send :
 *   - show: Data to show in a terminal
 *   - ttylog: Command execution log
 */
class DockerAttachedHandler extends EventEmitter {

  constructor(private exec: any, private stream: Writable) {
    super();
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    //logStream('emitting:', event, ...args);
    return super.emit(event, ...args);
  }

  write(data: string) {
    //logStream('receiving:', 'data', data.replace(/[\x00-\x1F\x7F-\x9F]/g, ""));
    this.stream.write(data);
  }

  resize(size: { h: number, w: number; }) {
    log('resizing exec:', size);
    this.exec.resize(size);
  }

  attach() {
    let firstty = true;
    this.stream.on('data', (chunk: any) => {
      for (const line of chunk.toString().split('\n')) {
        if (line.startsWith('ttylog')) {
          if (firstty) {
            // First ttylog does not match a real history log
            firstty = false;
            break;
          }
          const values = line.trim().split('#');
          const ttylog: TtyLog = {
            user: values[1],
            cmd: values[2],
            exitCode: parseInt(values[3]),
            workdir: values[4],
          };
          this.emit('ttylog', ttylog);
        } else {
          this.emit('show', line);
        }
      }
    });

    this.emit('attached');
  }
}

export interface IDockerService {
  findContainer(tutoId: string): Promise<any>;
  findContainerIfExists(tutoId: string): Promise<any>;
  isContainerReady(tutoId: string): boolean;
  run(tutoId: string): Promise<any>;
  attach(tutoId: string): Promise<DockerAttachedHandler>;
  exec(tutoId: string, command: string): Promise<DemuxStream>;
  destroy(tutoId: string): Promise<void>;
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
   * @param {any} dockerOptions Docker setup
   */
  private constructor(dockerOptions: any) {
    this.docker = new Docker(dockerOptions);
    this.cache = new DockerCache();
  }

  /**
   * Get the singleton instance. Options are accepted only for the first call (instanciation).
   * @param {any} dockerOptions Options of docker API service
   * @return {DockerService} The singleton service
   */
  static getInstance(): DockerService {
    if (!this.instance) {
      throw new Error('Instance not connected. Use `DockerService.connect(dockerOptions?: any)` first');
    }
    return this.instance;
  }

  /**
   * Connect the singleton instance to the docker daemon.
   * @param {any} dockerOptions Options of docker API service
   * @return {DockerService} The connected service
   */
  static connect(dockerOptions?: any): DockerService {
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
   * @return {Promise} The container if it is found
   */
  public async findContainer(tutoId: string): Promise<any> {
    return this.findContainerIfExists(tutoId)
      .then((container: any) => {
        return new Promise<any>((resolve, reject) => {
          if (!container) {
            reject(new Error(`Container for '${tutoId}' does not exist.`));
          }
          resolve(container);
        });
      });
  }

  /**
   * Find the tutorial container.
   * 
   * If the container does not exists, return null.
   *
   * @param {string} tutoId The tutorial identifier.
   * @return {Promise} The container if it is found
   */
  public async findContainerIfExists(tutoId: string): Promise<any> {
    // Use cache
    const cached = this.cache.container(tutoId);
    if (cached) {
      return cached;
    }

    // Use Docker API
    const containers = await this.docker.listContainers({ all: true });
    const match = containers.find((value: any) => value.Names.indexOf(`/${tutoId}`) !== -1);
    if (match) {
      log(`${tutoId}: container missing from cache`);
      return this.docker.getContainer(match.Id);
    }
  }

  /**
   * The container could be running but in a stop-remove-rebuild-restart state
   * 
   * @param tutoId 
   */
  public isContainerReady(tutoId: string): boolean {
    return this.cache.state(tutoId) == 'container started';
  }

  /**
   * Build the docker image of the tutorial and run a container
   * @param {string} tutoId The tutorial identifier
   */
  async run(tutoId: string): Promise<any> {
    // Check for existing container
    await this.destroy(tutoId);

    // Build the image
    const stream = await this.docker.buildImage({ context: `tutorials/${tutoId}`, src: ['Dockerfile'] }, { t: tutoId });
    await new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err: Error, res: any) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
    this.cache.update(tutoId, 'image built');

    // Create the container
    const container = await this.docker.createContainer({ Image: tutoId, name: tutoId, AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true, OpenStdin: false, StdinOnce: false });
    this.cache.update(tutoId, 'container created', container);

    // Start the container
    await container.start();
    this.cache.update(tutoId, 'container started');

    return container;
  }

  /**
   * Attach a socket to the container shell.
   * @param {string} tutoId The tutoriel identifier
   */
  async attach(tutoId: string): Promise<DockerAttachedHandler> {
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
      .then((exec) => {
        return exec.start({
          Tty: true,
          stream: true,
          stdin: true,
          stdout: true,
          stderr: true,
          hijack: true,
        }).then((stream: Writable) => new DockerAttachedHandler(exec, stream));
      });
  }

  /**
   * Execute a bash command in the given container
   * @param {string} tutoId The tutoriel identifier
   * @return {Readable} A readable stream to the command stout|stderr
   */
  async exec(tutoId: string, command: string): Promise<DemuxStream> {
    return this.findContainer(tutoId)
      .then((container) => container.exec({
        Cmd: ['/bin/bash', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
      }))
      .then((exec: any) => {
        log(`${tutoId}: exec '${command.replace('%', '%%')}'`);
        return exec.start();
      })
      .then((stream: Readable) => {
        const demux = new DemuxStream(stream);
        this.docker.modem.demuxStream(stream, demux.stdout, demux.stderr);
        return demux;
      });
  }

  /**
   * Write a file in the tutorial docker container
   * @param {string} tutoId The tutorial identifier
   * @return {Readable} A readable stream to get the file content
   */
  async writeFile(tutoId: string, filePath: string, fileContentStream: Readable): Promise<void> {

    return new Promise((resolve, reject) => {
      const tmpFile = tmp.fileSync();
      const ws = fs.createWriteStream(tmpFile.name);
      let fileContentLength = 0;
      ws.once('close', () => {
        // pack
        const pack = tar.pack();
        const entry = pack.entry({ name: path.basename(filePath), size: fileContentLength }, function (err) {
          if (err) { reject(err); }
          pack.finalize();

          DockerService.getInstance().findContainer(tutoId)
            .then((container: any) => {
              // Write tar in the container for extraction
              log(`${tutoId}: writing ${filePath}`);
              return container.putArchive(pack, { path: path.dirname(filePath) }, function (err: any, response: any) {
                if (err) {
                  return reject(err);
                }
                resolve(response);
              });
            })
            .catch((err: any) => {
              reject(err);
            });
        });
        fs.createReadStream(tmpFile.name).pipe(entry);
      });

      fileContentStream.pipe(ws);
      fileContentStream.on('data', (chunk) => fileContentLength += chunk.length);
    });
  }

  /**
   * Stop and remove the tutorial container
   * @param {string} tutoId The tutorial identifier
   */
  async destroy(tutoId: string): Promise<void> {
    this.cache.update(tutoId, 'destroying');
    const container = await this.findContainerIfExists(tutoId);

    if (container) {
      const inspect = await container.inspect();

      if (inspect['State']['Running']) {
        await container.stop();
        this.cache.update(tutoId, 'container stopped');
      }

      await container.remove();
      this.cache.remove(tutoId);
    }
  }
}

