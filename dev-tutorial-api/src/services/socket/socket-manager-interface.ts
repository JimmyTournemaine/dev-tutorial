import { Socket } from 'socket.io';

export interface ISocketManager {
  service(): void;
  socket(sock: Socket): this;

  on(event: 'attach', callback: (tutoId: string) => void): this;
  on(event: 'resize', callback: (size: { h: number; w: number }) => void): this;
  on(event: 'cmd', callback: (chunk: string) => void): this;

  emit(event: 'show', data: string): void;
  emit(event: 'next'): void;
  emit(event: 'completed'): void;
  emit(event: 'attached', tutoId: string): void;
  emit(event: 'err', error: { name: string; message: string }): void;

  emit(event: 'edit-start', info: { path: string }): void;
  emit(event: 'edit-error', data: string): void;
  emit(event: 'edit-content', data: string): void;
  emit(event: 'edit-close'): void;
}
