/* eslint-disable func-names */
import * as io from 'socket.io-client';
import * as fs from 'fs';
import { expect } from 'chai';
import { agent as request, Response } from 'supertest';
import { fail } from 'assert';
import { Server } from './server';
import { DockerService } from './services/docker/docker';
import { environment } from './environments/environment';
import { createUser } from './app.spec';
import { Token } from './models/token';
import { partial } from './utils/partial-done.utils.test';
import { LoggerFactory } from './services/logger/logger';

const logger = LoggerFactory.getLogger('test:server');

// Randomize input to simulate input chunks
const randomizeInput = (input: string, callback: (chunk: string) => void): void => {
  let index = 0;
  while (index < input.length) {
    const substrSize = Math.min(input.length - index, Math.floor(Math.random() * 3) + 1); // at most 4?
    const value = input.substr(index, substrSize);
    index += substrSize;

    setTimeout(() => callback(value), 100);
  }
};

describe('[IT] Server', () => {
  describe('Server managing', () => {
    let server1: Server;
    let server2: Server;

    beforeEach('starts the server', async () => {
      server1 = new Server();
      await server1.boot();
    });

    afterEach('stop the server', async function () {
      this.timeout(5000);
      await server1.stop();

      if (server2) {
        try {
          await server2.stop();
        } catch {
          // server2 already stopped
        }
      }
    });

    it('should throw error on concurrent server', (done) => {
      server2 = new Server();
      server2
        .handleError(() => done())
        .boot()
        .then(() => fail('expected to throw'))
        .catch(() => done());
    });

    it('should throw error on concurrent HTTP server', (done) => {
      server2 = new Server();
      server2
        .handleError(() => done())
        .startHttpServer()
        .then(() => fail('expected to throw'))
        .catch(() => done());
    });

    it('should throw error on concurrent Socket server', (done) => {
      server2 = new Server();
      server2
        .handleError(() => done())
        .startSocketServer()
        .then(() => fail('expected to throw'))
        .catch(() => done());
    });

    it('should throw error on stopping non-running server', (done) => {
      server2 = new Server();
      server2
        .handleError(() => done())
        .stop()
        .then(() => fail('expected to throw'))
        .catch(() => done());
    });
  });

  describe('Server integration tests', () => {
    let server: Server;
    let token: Token;

    before('starts the server', async () => {
      server = new Server();
      await server.boot();
    });

    after('stop the server', async function () {
      this.timeout(10000);
      await server.stop();
    });

    it('should handle socket errors', (done) => {
      const socket = io('http://localhost:3001');
      socket.once('error', () => done());
    });

    describe('Socket integration', function () {
      this.timeout(20000);

      let socket: SocketIOClient.Socket;
      const tutoId = 'dev';

      beforeEach(async function () {
        this.timeout(30000);
        await DockerService.connect(environment.docker).run(tutoId);

        ({ accessToken: token } = await createUser(server.app));
        socket = io('http://localhost:3001', { query: { token: token.token } });
        socket.on('error', (err: Error) => { logger.debug(err); });
      });

      afterEach(() => {
        socket.disconnect();
      });

      it('should attaching a socket to a docker container and get some commands results', (done) => {
        const part = partial(2, done);
        socket.on('show', (show: string) => {
          try {
            expect(show).to.contains('Linux'); // `uname` result
            part.done();
          } catch (error) {
            // will get 'uname\r' then 'Linux' from the docker container
            logger.debug(`show: ${show}`);
          }
        });
        socket.on('attached', (id: string) => {
          expect(id).to.equals(tutoId);
          part.done();

          setTimeout(() => socket.emit('cmd', 'uname\r'), 200);
        });
        socket.emit('attach', tutoId);
      });

      it('should attaching a socket to a docker container and get some commands results after a reconnection', (done) => {
        const part = partial(2, done);

        socket.on('show', (show: string) => {
          try {
            expect(show).to.contains('Linux'); // `uname` result
            part.done();
          } catch (error) {
            // Do nothing
          }
        });
        socket.once('attached', (id: string) => {
          logger.debug('on attached', id);
          expect(id).to.equals(tutoId);
          part.done();

          socket.disconnect();
          socket.connect();
          socket.emit('cmd', 'uname\r');
        });
        socket.emit('attach', tutoId);
      });

      it('should attaching a socket to a docker container and test \'edit\' hook', (done) => {
        const part = partial(3, done);

        socket.on('edit-start', (info: { path: string; }) => {
          socket.on('edit-content', (chunk: string) => {
            expect(chunk).not.to.equal(undefined);
            part.done();
          });
          socket.on('edit-error', (err: string) => {
            part.done(`should not receive an error:${err}`);
          });
          socket.on('edit-close', () => {
            part.done();
          });

          expect(info).to.have.property('path');
          expect(info.path).not.to.equal(undefined);
          part.done();
        });
        socket.on('attached', () => {
          setTimeout(() => {
            randomizeInput('edit anaconda-post.log\r', (chunk: string) => {
              socket.emit('cmd', chunk);
            });
          }, 200);
        });
        socket.on('err', (err: Error) => {
          part.done(err);
        });
        socket.emit('attach', tutoId);
      });

      it('should attaching a socket to a docker container and test \'edit\' hook error handling', (done) => {
        const part = partial(2, done);

        socket.on('edit-start', (info: { path: string; }) => {
          socket.on('edit-content', () => {
            part.done('stderr should be handle by edit-error');
          });
          socket.on('edit-error', (err: Error) => {
            expect(err).not.to.equal(undefined);
            part.done();
          });
          socket.on('edit-close', () => {
            part.done('error dont send close');
          });

          expect(info).to.have.property('path');
          expect(info.path).not.to.equal(undefined);
          part.done();
        });
        socket.on('attached', () => {
          logger.debug('attached');
          setTimeout(() => socket.emit('cmd', 'edit testfile.txt\r'), 200);
        });
        socket.emit('attach', tutoId);
      });

      it('should send an error when trying to attach a socket to a non existent docker container', (done) => {
        socket.on('attached', () => {
          done(new Error('Should not be attached to void'));
        });
        socket.on('err', (err: Error) => {
          expect(err).to.have.property('name');
          expect(err).to.have.property('message');
          done();
        });
        socket.emit('attach', 'not exist');
      });

      it('should complete the demo tutorial', (done) => {
        const part = partial(6, done);
        socket.on('attached', () => {
          part.done(); // 1
          // Slide 2
          socket.once('next', () => {
            part.done(); // 2
            // All slides done
            socket.once('next', () => done(new Error('Got next instead of completed')));
            socket.once('completed', () => part.done());
            socket.once('edit-start', () => {
              part.done();
            });
            socket.once('edit-close', () => {
              part.done();

              // send a file (should complete the tutorial - see on('completed')
              void request(server.app)
                .post(`/api/tuto/dev/write?path=${encodeURIComponent('/root/test.txt')}`)
                .set('Authorization', `Bearer ${token.token}`)
                .set('Content-Type', 'application/octet-stream')
                .send(fs.readFileSync('./test/test-file.txt'))
                .then((res: Response) => {
                  expect(res.status).to.equal(204);
                  part.done();
                  socket.emit('cmd', '\r'); // force validation
                });
            });

            randomizeInput('edit test.txt\r', (chunk: string) => {
              socket.emit('cmd', chunk);
            });
          });
          // Slide 1
          randomizeInput('cd\rtouch /root/test.txt\r', (chunk: string) => {
            socket.emit('cmd', chunk);
          });
        });
        socket.emit('attach', tutoId);
      });
    });
  });
});
