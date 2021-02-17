import { ISocketManager } from './socket-manager-interface';

export interface ISocketService {
  tutoId: string;
  socket: ISocketManager;
  wd: string;
}
