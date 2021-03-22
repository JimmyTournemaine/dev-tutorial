import { Socket } from 'socket.io';
import * as debug from 'debug';
import * as io from 'socket.io';
import { ISocketService } from './socket-interface';
import { SocketService } from './socket';
import { CacheItemState } from '../docker/cache';
import { IdentifiedSocket } from '../../middleware/auth';

const logger = debug('app:socket');

export interface ISocketManager {
  socket(sock: Socket): void;
}

interface State {
  [index: string]: CacheItemState;
}

type SocketListener = (...args: unknown[]) => void;

export class SocketManager implements ISocketManager {
  private static instance: ISocketManager;

  private services: Map<string, ISocketService>;

  private state: State;

  constructor(private server: io.Server) {
    this.services = new Map<string, ISocketService>();
    this.state = {};
  }

  socket(socket: IdentifiedSocket): void {
    const user = socket.ident.userId;

    if (this.services.has(user)) {
      logger('Known user, joining existing room', { user, socket: socket.id });
      const service = this.services.get(user);
      // Switch sockets
      const oldSocket = service.socket;
      service.socket = socket;
      // Switch sockets listeners
      for (const eventName of oldSocket.eventNames()) {
        for (const listener of oldSocket.rawListeners(eventName) as SocketListener[]) {
          socket.addListener(eventName, listener);
        }
      }
    } else {
      logger('New user, creating service for socket', { user, socket: socket.id });
      this.services.set(user, new SocketService(socket));
    }
  }
}
