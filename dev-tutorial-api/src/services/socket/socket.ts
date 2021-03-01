import * as debug from 'debug';
import { Validators } from '../validators/abstract/validators';
import { Hook } from './hook';
import { HookFactory } from './hook-factory';
import { ValidatorDescriptorsParser } from '../validators/abstract/validator-parser';
import { TutorialService } from '../tutorial/tutorial';
import { TutorialDescriptorDocument } from '../../models/tutorial';
import { DockerService } from '../docker/docker';
import { TtyLog } from '../docker/ttylog';
import { ISocketService } from './socket-interface';
import { ISocketManager } from './socket-manager-interface';
import { Validation } from './socket-validation';
import { SocketError } from './socket-error';

const logger = debug('app:socket');
const hookLog = debug('app:hook');

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
   * @param socket The socket manager service
   */
  constructor(public socket: ISocketManager) {
    this.hooks = HookFactory.createHooks(this);
    this.validation = new Validation();

    this.socket.on('attach', (tutoId: string) => {
      logger('got attached');
      this.tutoId = tutoId;

      void TutorialService.getInstance().getTutorial(tutoId).then((tuto: TutorialDescriptorDocument) => {
        if (tuto === null) {
          throw new Error(`Tutorial '${tutoId}' has not been loaded`);
        }
        // Load all validators
        const validators: Validators[] = [];
        for (const slide of tuto.slides) {
          validators.push(ValidatorDescriptorsParser.create(this, slide.validators));
        }

        // When validator are done, emit next and set next validator (next slide)
        logger('setting validator');
        this.validation.setValidators(validators[0]);
        for (let i = 0; i < validators.length - 1; i++) {
          validators[i].once('valid', () => {
            logger('next');
            this.validation.setValidators(validators[i + 1]);
            this.socket.emit('next');
          });
        }
        // the last validator send 'completed' instead of next
        validators[validators.length - 1].on('valid', () => {
          logger('completed');
          this.socket.emit('completed');
        });
      }).catch((err: Error) => this.socket.emit('err', SocketError.fromError(err)));

      // Get docker handler
      void DockerService.getInstance().attach(tutoId)
        .then((handler) => {
          logger('docker attached');
          handler.on('attached', () => socket.emit('attached', tutoId));
          handler.on('show', (data: string) => { this.validation.output(data); socket.emit('show', data); });
          handler.on('ttylog', (ttylog: TtyLog) => {
            this.wd = ttylog.workdir;
            const clear = this.hook(ttylog.cmd);
            if (clear) {
              handler.write('\x0C');
            }
            this.validation.ttylog(ttylog);
          });
          // handler.on('ttylog', (ttylog: TtyLog) => socket.emit('ttylog', ttylog));

          this.socket.on('resize', (size: { h: number, w: number; }) => handler.resize(size));
          this.socket.on('cmd', (chunk: string) => handler.write(chunk));

          handler.attach();
        })
        .catch((err: Error) => this.socket.emit('err', SocketError.fromError(err)));
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
          hookLog('hook processing error', reason);
        });
        return hook.shouldCancel();
      }
    }
    return false;
  }
}
