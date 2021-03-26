import { EventEmitter } from 'events';
import { Validators } from '../validators/abstract/validators';
import { Hook } from './hook';
import { HookFactory } from './hook-factory';
import { ValidatorDescriptorsParser } from '../validators/abstract/validator-parser';
import { TutorialService } from '../tutorial/tutorial';
import { DockerService } from '../docker/docker';
import { TtyLog } from '../docker/ttylog';
import { ISocketService } from './socket-interface';
import { Validation } from './socket-validation';
import { SocketError as ErrorEvent } from './socket-error';
import { LoggerFactory } from '../logger/logger';

const logger = LoggerFactory.getLogger('app:socket:service');

/**
 * Socket service to use terminal
 */
export class SocketService implements ISocketService {
  tutoId: string;

  validation: Validation;

  wd = '/';

  currentCommand = '';

  private hooks: Hook[];

  /**
   * Initialize the object
   *
   * @param socket The event emitter
   */
  constructor(public socket: EventEmitter) {
    this.hooks = HookFactory.createHooks(this);
    this.validation = new Validation();

    this.socket.on('attach', (tutoId: string) => {
      this.tutoId = tutoId;

      void this.loadValidators()
        .catch((err: Error) => this.socket.emit('err', ErrorEvent.fromError(err)));

      void this.attach()
        .catch((err: Error) => this.socket.emit('err', ErrorEvent.fromError(err)));
    });
  }

  public async attach(): Promise<void> {
    if (!this.tutoId) {
      return Promise.reject(new Error('No tutorial identifier provided'));
    }
    const handler = await DockerService.getInstance().attach(this.tutoId);
    handler.on('attached', () => this.socket.emit('attached', this.tutoId));
    handler.on('show', (data: string) => { this.validation.output(data); this.socket.emit('show', data); });
    handler.on('ttylog', (ttylog: TtyLog) => {
      this.wd = ttylog.workdir;
      const clear = this.hook(ttylog.cmd);
      if (clear) {
        handler.write('\x0C');
      }
      this.validation.ttylog(ttylog);
    });
    // handler.on('ttylog', (ttylog: TtyLog) => socket.emit('ttylog', ttylog));
    this.socket.on('resize', (size: { h: number; w: number; }) => handler.resize(size));
    this.socket.on('cmd', (chunk: string) => handler.write(chunk));
    return handler.attach();
  }

  private async loadValidators(): Promise<void> {
    const tuto = await TutorialService.getInstance().getTutorial(this.tutoId);
    if (tuto === null) {
      throw new Error(`Tutorial '${this.tutoId}' has not been loaded`);
    }
    // Load all validators
    const validators: Validators[] = [];
    for (const slide of tuto.slides) {
      validators.push(ValidatorDescriptorsParser.create(this, slide.validators));
    }
    // When validator are done, emit next and set next validator (next slide)
    logger.debug('setting validator');
    this.validation.setValidators(validators[0]);
    for (let i = 0; i < validators.length - 1; i++) {
      validators[i].once('valid', () => {
        logger.debug('next');
        this.validation.setValidators(validators[i + 1]);
        this.socket.emit('next');
      });
    }
    // the last validator send 'completed' instead of next
    validators[validators.length - 1].on('valid', () => {
      logger.debug('completed');
      this.socket.emit('completed');
    });
  }

  /**
   * Hook command to run specific action
   *
   * @param {string} cmd The command to run
   * @returns {boolean} Should the command be ignored.
   */
  hook(cmd: string): boolean {
    for (const hook of this.hooks) {
      if (hook.test(cmd)) {
        hook.process(cmd).catch((reason) => {
          logger.error('hook processing error', reason);
        });
        return hook.shouldCancel();
      }
    }
    return false;
  }
}
