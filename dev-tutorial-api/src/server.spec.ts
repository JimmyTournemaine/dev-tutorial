import { expect } from 'chai';
import { agent as request } from 'supertest';
import * as io from 'socket.io-client';
import * as fs from 'fs';
import * as debug from 'debug';
import { Done } from 'mocha';
import { Server } from './server';
import { DockerService } from './services/docker/docker';
import { TtyLog } from './services/docker/ttylog';
import { environment } from './environments/environment';
import { SocketManager } from './services/socket/socket-manager';

const logger = debug('test:server');

/**
 * Allow to handle multiple "done" callbacks.
 */
class PartialDone {
  private value = 0;

  constructor(private expected: number, private mochaDone: Done) { }

  done(err?: Error | string): void {
    if (err) {
      const reason = err instanceof Error ? err.message : err;
      this.mochaDone(new Error(`error at ${this.value}/${this.expected}, reason: ${reason}`));
      return;
    }
    logger('%d of %d done', this.value + 1, this.expected);
    if (++this.value === this.expected) {
      this.mochaDone();
    }
  }
}
const partial = (expected: number, done: Done): PartialDone => new PartialDone(expected, done);

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

xdescribe('Server integration tests', () => {
  let server: Server;

  before('starts the server', async () => {
    server = new Server();
    await server.boot();
  });

  after('stop the server', async () => {
    await server.stop();
  });

  describe('Socket integration', function () {
    this.timeout(20000);

    let socket: SocketIOClient.Socket;
    const tutoId = 'dev';

    beforeEach(async function () {
      this.timeout(30000);
      await DockerService.connect(environment.docker).run(tutoId);

      socket = io('http://localhost:3000');
    });

    afterEach(() => {
      socket.disconnect();
      SocketManager.destroy();
    });

    it('should attaching a socket to a docker container and get some commands results', (done) => {
      const part = partial(2, done);
      socket.on('show', (show: string) => {
        try {
          expect(show).to.contains('Linux'); // `uname` result
          part.done();
        } catch (error) {
          // will get 'uname\r' then 'Linux' from the docker container
          debug(`show: ${show}`);
        }
      });
      socket.on('attached', (id: string) => {
        expect(id).to.equals(tutoId);
        part.done();

        socket.emit('cmd', 'uname\r');
      });
      socket.emit('attach', tutoId);
    });

    xit('should attaching a socket to a docker container and get some commands results after a reconnection', (done) => {
      const part = partial(2, done);

      socket.on('show', (show: string) => {
        try {
          expect(show).to.contains('Linux'); // `uname` result
          part.done();
        } catch (error) {
          part.done(error);
        }
      });
      socket.on('attached', (id: string) => {
        logger('on attached', id);
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

      socket.on('ttylog', (ttylog: TtyLog) => {
        part.done(`should not got ttylog on edit hook: ${ttylog.toString()}`);
      });
      socket.on('edit-start', (info: { path: string; }) => {
        socket.on('edit-content', (chunk: string) => {
          expect(chunk).not.to.be.undefined;
          part.done();
        });
        socket.on('edit-error', (err: string) => {
          part.done(`should not receive an error:${err}`);
        });
        socket.on('edit-close', () => {
          part.done();
        });

        expect(info).to.have.property('path');
        expect(info.path).not.to.be.undefined;
        part.done();
      });
      socket.on('attached', () => {
        randomizeInput('edit anaconda-post.log\r', (chunk: string) => {
          socket.emit('cmd', chunk);
        });
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
          expect(err).not.to.be.undefined;
          part.done();
        });
        socket.on('edit-close', () => {
          part.done('error dont send close');
        });

        expect(info).to.have.property('path');
        expect(info.path).not.to.be.undefined;
        part.done();
      });
      socket.on('attached', () => {
        logger('attached');
        socket.emit('cmd', 'edit testfile.txt\r');
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

    xit('should complete the demo tutorial', (done) => {
      socket.on('attached', () => {
        // Slide 2
        socket.once('next', () => {
          // All slides done
          socket.once('next', () => done(new Error('Got next instead of completed')));
          socket.once('completed', () => done());
          socket.once('edit-start', () => {
            let content = '';
            socket.on('edit-content', (chunk: string) => {
              content += chunk;
            });
            socket.once('edit-close', () => {
              expect(content).to.be.empty;

              // send a file (should complete the tutorial - see on('completed')
              void request(server.app)
                .post(`/tuto/dev/write?path=${encodeURI('/root/test.txt')}`)
                .set('content-type', 'application/octet-stream')
                .send(fs.readFileSync('./test/test-file.txt'))
                .expect(204)
                .then(() => {
                  socket.emit('cmd', '\r'); // force validation
                });
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
