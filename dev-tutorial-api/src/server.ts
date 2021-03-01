#!/usr/bin/env node

import * as http from 'http';
import * as debug from 'debug';
import * as io from 'socket.io';
import { AddressInfo } from 'net';
import { SocketManager } from './services/socket/socket-manager';
import { Application } from './app';

const logger = debug('app:server');

/**
 * The main server.
 */
export class Server {
  private application: Application;

  private port: string | number;

  private httpServer: http.Server;

  private socketServer: http.Server;

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
    });
  }

  /**
   * Start the Socket server.
   */
  startSocketServer(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Create a server
      this.socketServer = http.createServer();
      this.socketServer.on('error', (err: Error) => this.onError(err));
      this.socketServer.on('listening', () => {
        this.onListening(this.socketServer.address());
        resolve();
      });
      // Bind SocketIO
      const ioServer = io(this.socketServer);
      ioServer.on('connection', (sock: SocketIO.Socket) => {
        this.onIOConnection(sock);
      });
      ioServer.on('error', (err: Error) => this.onError(err));

      this.socketServer.listen(3001);
    });
  }

  /**
   * Stop all the services, then stop the server itself.
   */
  async stop(): Promise<void> {
    await this.application.unload();
    await new Promise<void>((resolve, reject) => {
      this.httpServer.close((err?: Error) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
    await new Promise<void>((resolve, reject) => {
      this.socketServer.close((err?: Error) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
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
  private onError(error: NodeJS.ErrnoException): never {
    if (error.syscall && error.syscall === 'listen') {
      const bind = typeof this.port === 'string' ? `Pipe ${this.port}` : `Port ${this.port}`;

      // handle specific listen errors with friendly messages
      switch (error.code) {
        case 'EACCES':
          throw new Error(`${bind} requires elevated privileges`);
        case 'EADDRINUSE':
          throw new Error(`${bind} is already in use`);
        default:
          throw error;
      }
    }

    throw error;
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

  /**
   * Event listener for IOSocket connection
   *
   * @param sock The connected socket.
   */
  private onIOConnection(sock: SocketIO.Socket): void {
    logger('New socket connection');
    SocketManager.getInstance().socket(sock).service();
    sock.on('disconnect', (reason) => logger('socket %s disconnected', sock.id, reason));
  }
}
