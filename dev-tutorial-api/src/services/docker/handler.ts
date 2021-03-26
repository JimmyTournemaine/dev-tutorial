import { EventEmitter } from 'events';
import { Writable } from 'stream';
import { Exec } from 'dockerode';
import { TtyLog } from './ttylog';
import { LoggerFactory } from '../logger/logger';

const logger = LoggerFactory.getLogger('app:docker-handler');

/**
 * Docker attached exec handler
 *
 * Use write to send data
 * Send :
 *   - show: Data to show in a terminal
 *   - ttylog: Command execution log
 */
export class DockerAttachedHandler extends EventEmitter {
  constructor(private exec: Exec, private stream: Writable) {
    super();
  }

  emit(event: string | symbol, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  write(data: string): void {
    this.stream.write(data);
  }

  resize(size: { h: number; w: number; }): void {
    logger.debug('resizing exec:', size);
    void this.exec.resize(size);
  }

  attach(): void {
    let firstty = true;
    this.stream.on('data', (chunk: string|Buffer) => {
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
            exitCode: parseInt(values[3], 10),
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
