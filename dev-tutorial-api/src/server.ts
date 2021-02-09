#!/usr/bin/env node
/* eslint-disable no-fallthrough */
/* eslint-disable @typescript-eslint/no-use-before-define */

import { Socket } from 'socket.io'
import { SocketManager } from './services/socket/socket'
import { app } from './app'
import * as http from 'http'
import * as debug from 'debug'
import * as socketio from 'socket.io'

const logger = debug('app:server')

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || '3000')
app.set('port', port)

/**
 * Create HTTP server.
 */
const server = http.createServer(app)

/**
 * Create Socket server
 */
const io = socketio(server)

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

/**
 * Listen on socket connection
 */
io.on('connection', onIOConnection)
io.on('error', onError)

/**
 * Normalize a port into a number, string, or false.
 * @param {int} val Port number
 * @return {int} Normalized port number
 */
function normalizePort (val: string): string | number | false {
  const port = parseInt(val, 10)

  if (isNaN(port)) {
    // named pipe
    return val
  }

  if (port >= 0) {
    // port number
    return port
  }

  return false
}

/**
 * Event listener for HTTP server "error" event.
 * @param {any} error
 */
function onError (error: any): never {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening (): void {
  const addr = server.address()
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port
  debug('Listening on ' + bind)
}

/**
 * Event listener for IOSocket connection
 * @param {Socket} sock
 */
function onIOConnection (sock: Socket): void {
  SocketManager.getInstance().socket(sock).service()

  sock.on('disconnect', (reason) => logger('socket %s disconnected', sock.id, reason))
}

export { server }
