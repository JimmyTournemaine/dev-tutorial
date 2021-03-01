import { Socket } from 'socket.io';
import * as debug from 'debug';
import { ISocketService } from './socket-interface';
import { ISocketManager } from './socket-manager-interface';
import { SocketService } from './socket';
import { DockerService } from '../docker/docker';
import { CacheItemState, StateChangedEvent } from '../docker/cache';
import { SocketError } from './socket-error';

const logger = debug('app:socket');

type SocketEventListener = {
  (tutoId: string): void;
  (size: {
    h: number;
    w: number;
  }): void;
  (chunk: string): void;
};

interface State {
  [index: string]: CacheItemState;
}

export class SocketManager implements ISocketManager {
  private static instance: ISocketManager;

  private socketService: ISocketService;

  private listeners: Map<string, SocketEventListener[]>;

  private ioSocket: Socket;

  private state: State;

  private constructor() {
    this.listeners = new Map<string, SocketEventListener[]>();
    this.state = {};

    process.on('unhandledRejection', (reason: Error) => {
      console.error('Unhandled Rejection:', reason);
      this.emit('err', SocketError.fromError(reason));
    });

    DockerService.getInstance().listenStatusChanged((change: StateChangedEvent) => {
      this.state[change.tutoId] = change.state;
    });
  }

  service(): void {
    // if (!this.socketService) {
    //   logger('New socket service');
    this.socketService = new SocketService(this);
    // } else {
    //   logger('Socket service already running');
    // }
  }

  socket(socket: Socket): this {
    // disconnect the previous socket
    if (this.ioSocket && this.ioSocket.connected) {
      this.ioSocket.disconnect();
    }

    // use the new one
    this.ioSocket = socket;

    // move all the listeners to the new socket
    // FIXME: listeners should be destroyed if tutorial is restarted (container recreated)
    // for (const entry of this.listeners.entries()) {
    //   const event = entry[0];
    //   for (const listener of entry[1]) {
    //     this.ioSocket.on(event, listener);
    //   }
    // }

    return this;
  }

  on(event: string, listener: SocketEventListener): this {
    this.ioSocket.on(event, listener);

    const listeners = this.listeners.has(event) ? this.listeners.get(event) : new Array<SocketEventListener>();
    listeners.push(listener);
    this.listeners.set(event, listeners);

    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    // eslint-disable-next-line no-control-regex
    logger('emitting \'%s\'', event, ...args.map((value: unknown) => value.toString().replace(/[\u0000-\u001F\u007F-\u009F]/g, '')));

    return this.ioSocket.emit(event, ...args);
  }

  static getInstance(): ISocketManager {
    if (this.instance == null) {
      this.instance = new SocketManager();
    }
    return this.instance;
  }

  static destroy(): void {
    delete this.instance;
  }
}
