import { EventEmitter } from 'events';

export interface ISocketService {
  tutoId: string;
  wd: string;
  socket: EventEmitter;
  attach(): Promise<void>;
}
