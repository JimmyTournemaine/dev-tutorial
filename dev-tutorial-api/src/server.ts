#!/usr/bin/env node

import * as http from 'http';
import * as debug from 'debug';
import * as io from 'socket.io';
import { createHttpTerminator } from 'http-terminator';
import { AddressInfo } from 'net';
import { SocketManager } from './services/socket/socket-manager';
import { Application } from './app';
import { IdentifiedSocket, socketAuth } from './middleware/auth';

const logger = debug('app:server');

/**
 * The main server.
 */
export class Server {
  private application: Application;

  private port: string | number;

  private httpServer: http.Server;

  private socketServer: io.Server;

  private serverTerminators: { terminate: () => Promise<void> }[] = [];

  private errorHandler: (err: Error) => void|never;

  constructor(...extraDirs: string[]) {
    this.port = this.normalizePort(process.env.PORT || '3000');

    this.application = new Application(...extraDirs);
    this.application.setPort(this.port);
  }

  get app(): http.RequestListener {
    return this.application.requestListener;
  }

  /**
   * Boot the application and start the HTTP and Socket servers.
   *
   * @returns A promise that the boot is completed.
   */
  async boot(): Promise<void> {
    await this.application.bind();
    await this.startHttpServer();
    await this.startSocketServer();
  }

  /**
   * Start the HTTP server.
   *
   * @returns A promise that the server has started.
   */
  startHttpServer(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.httpServer = http.createServer(this.application.requestListener);
      this.httpServer.on('error', (err: Error) => this.onError(err));
      this.httpServer.on('listening', () => {
        this.onListening(this.httpServer.address());
        resolve();
      });
      this.httpServer.listen(this.port);
      this.serverTerminators.push(createHttpTerminator({ server: this.httpServer }));
    });
  }

  /**
   * Start the Socket server.
   */
  startSocketServer(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Create a server
      const server = http.createServer()
        .on('error', (err: Error) => this.onError(err))
        .on('listening', () => {
          this.onListening(server.address());
          resolve();
        });
      // Bind SocketIO
      this.socketServer = io(server);
      const manager = new SocketManager(this.socketServer);
      this.socketServer
        .use(socketAuth)
        .on('connection', (sock: IdentifiedSocket) => {
          sock.on('disconnect', (reason) => logger('socket %s disconnected', sock.id, reason));
          manager.socket(sock);
        })
        .on('error', (err: Error) => this.onError(err));

      server.listen(3001);
      this.serverTerminators.push(createHttpTerminator({ server }));
    });
  }

  /**
   * Stop all the services, then stop the server itself.
   *
   * @returns A promise that servers will be stopped properly
   */
  async stop(): Promise<void[]> {
    logger('Stopping servers...');
    await this.application.unload();
    return Promise.all(this.serverTerminators.map((term) => term.terminate()));
  }

  handleError(callback: Server['errorHandler']): this {
    this.errorHandler = callback;
    return this;
  }

  /**
   * Normalize a port into a number, string, or false.
   *
   * @param val Port number
   * @returns Normalized port number
   */
  private normalizePort(val: string): string | number {
    const serverPort = parseInt(val, 10);

    if (Number.isNaN(serverPort)) {
      // named pipe
      return val;
    }

    if (serverPort >= 0) {
      // port number
      return serverPort;
    }

    throw Error(`Unexpected port value: ${serverPort}`);
  }

  /**
   * Event listener for HTTP server "error" event.
   *
   * @param error The error throws by the server.
   */
  private onError(error: NodeJS.ErrnoException): void {
    let err = error;
    if (error.syscall && error.syscall === 'listen') {
      const bind = typeof this.port === 'string' ? `Pipe ${this.port}` : `Port ${this.port}`;

      // handle specific listen errors with friendly messages
      switch (error.code) {
        case 'EACCES':
          err = new Error(`${bind} requires elevated privileges`);
          break;
        case 'EADDRINUSE':
          err = new Error(`${bind} is already in use`);
        // no default
      }
    }

    if (this.errorHandler) {
      this.errorHandler(err);
    } else {
      throw err;
    }
  }

  /**
   * Event listener for HTTP server "listening" event.
   *
   * @param addr server address.
   */
  private onListening(addr: string | AddressInfo): void {
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
    logger(`Listening on ${bind}`);
  }
}
