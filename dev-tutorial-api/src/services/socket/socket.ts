import { Socket } from 'socket.io'
import { DockerService, TtyLog } from '../docker/docker'
import * as debug from 'debug'
import { Hook, HookFactory } from './hook'
import { ValidatorDescriptorsParser, Validators } from './validators/validator'
import { TutorialService } from '../tutorial/tutorial'
import { TutorialDescriptorDocument } from '../../models/tutorial'
import { AsyncWorker, ErrorCallback, queue, QueueObject } from 'async'

const logger = debug('app:socket')
const batchLog = debug('app:socket-validation')
const hookLog = debug('app:hook')

class ValidationBatch {
  output = '';
  ttylog: TtyLog;

  async validate (validators: Validators) {
    if (this.ttylog && validators.preValidate(this.ttylog.cmd)) {
      await validators.validate(this.output, this.ttylog)
    }
  }
}

class Validation {
  private batch: ValidationBatch = new ValidationBatch();
  private _validators: Validators;

  private worker: AsyncWorker<ValidationBatch, Error>;
  private queue: QueueObject<ValidationBatch>;

  constructor () {
    this.worker = async (batch: ValidationBatch, callback: ErrorCallback<Error>) => await this.validateBatch(batch, callback)
    this.queue = queue(this.worker, 1)
  }

  async validateBatch (batch: ValidationBatch, callback: ErrorCallback<Error>) {
    batchLog('validate', batch.ttylog)
    await batch.validate(this._validators)
    callback()
  }

  validators (validators: Validators) {
    batchLog('set validators')
    this._validators = validators
  }

  output (data: string) {
    this.batch.output += data
  }

  ttylog (ttylog: TtyLog) {
    batchLog('ttylog', ttylog)
    this.batch.ttylog = ttylog
    this.end()
  }

  end () {
    this.queue.push(this.batch)
    this.batch = new ValidationBatch()
  }
}

export interface ISocketService {
  tutoId: string;
  wd: string;
}

export interface ISocketManager {
  service(): void;
  socket(sock: Socket): this;

  on(event: 'attach', callback: (tutoId: string) => void): this;
  on(event: 'resize', callback: (size: { h: number, w: number; }) => void): this;
  on(event: 'cmd', callback: (chunk: string) => void): this;

  emit(event: 'show', data: string): void;
  emit(event: 'next'): void;
  emit(event: 'completed'): void;
  emit(event: 'attached', tutoId: string): void;
  emit(event: 'err', error: { name: string, message: string; }): void;

  emit(event: 'edit-start', info: { path: string; }): void;
  emit(event: 'edit-error', data: string): void;
  emit(event: 'edit-content', data: string): void;
  emit(event: 'edit-close'): void;
}
type SocketEventListener = (...args: any[]) => void;
export class SocketManager implements ISocketManager {
  private static instance: ISocketManager;

  private _service: ISocketService;

  private listeners: Map<string | symbol, SocketEventListener[]>;
  private _socket: Socket;

  private constructor () {
    this.listeners = new Map()
  }

  service (): void {
    if (!this._service) {
      logger('New socket service')
      this._service = new SocketService(this)
    } else {
      logger('Socket service already running')
    }
  }

  socket (socket: Socket): this {
    if (this._socket) {
      this._socket.disconnect()
    }
    this._socket = socket

    for (const entry of this.listeners.entries()) {
      const event = entry[0]
      for (const listener of entry[1]) {
        this._socket.on(event, listener)
      }
    }

    return this
  }

  on (event: string | symbol, listener: SocketEventListener): this {
    this._socket.on(event, listener)

    const listeners = this.listeners.has(event) ? this.listeners.get(event) : new Array<SocketEventListener>()
    listeners.push(listener)
    this.listeners.set(event, listeners)

    return this
  }

  emit (event: string | symbol, ...args: any[]): boolean {
    return this._socket.emit(event, ...args)
  }

  static getInstance (): ISocketManager {
    if (this.instance == null) {
      this.instance = new SocketManager()
    }
    return this.instance
  }

  static destroy (): void {
    delete this.instance
  }
}

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
   */
  constructor (public socket: ISocketManager) {
    this.hooks = HookFactory.createHooks(this)
    this.validation = new Validation()

    this.socket.on('attach', async (tutoId: string) => {
      this.tutoId = tutoId

      TutorialService.getInstance().getTutorial(tutoId).then((tuto: TutorialDescriptorDocument) => {
        // Load all validators
        const validators: Validators[] = []
        for (const slide of tuto.slides) {
          validators.push(ValidatorDescriptorsParser.create(this, slide.validators))
        }

        // When validator are done, emit next and set next validator (next slide)
        this.validation.validators(validators[0])
        for (let i = 0; i < validators.length - 1; i++) {
          validators[i].once('valid', () => {
            logger('next')
            this.validation.validators(validators[i + 1])
            this.socket.emit('next')
          })
        }
        // the last validator send 'completed' instead of next
        validators[validators.length - 1].on('valid', () => {
          logger('completed')
          this.socket.emit('completed')
        })
      })

      // Get docker handler
      DockerService.getInstance().attach(tutoId)
        .then((handler) => {
          handler.on('attached', () => socket.emit('attached', tutoId))
          handler.on('show', (data: string) => { this.validation.output(data); socket.emit('show', data) })
          handler.on('ttylog', (ttylog: TtyLog) => {
            this.wd = ttylog.workdir
            const clear = this.hook(ttylog.cmd)
            if (clear) {
              handler.write('\x0C')
            }
            this.validation.ttylog(ttylog)
          })
          // handler.on('ttylog', (ttylog: TtyLog) => socket.emit('ttylog', ttylog));

          this.socket.on('resize', (size: { h: number, w: number; }) => handler.resize(size))
          this.socket.on('cmd', (chunk: string) => handler.write(chunk))

          handler.attach()
        })
        .catch((err: Error) => this.socket.emit('err', { name: err.name, message: err.message }))
    })
  }

  /**
   * Hook command to run specific action
   *
   * @param {string} cmd The command to run
   * @return {boolean} Should the command be ignored.
   */
  hook (cmd: string): boolean {
    for (const hook of this.hooks) {
      if (hook.test(cmd)) {
        hook.process(cmd).catch((reason) => {
          hookLog('hook processing error', reason)
        })
        return hook.shouldCancel()
      }
    }
    return false
  }
}
