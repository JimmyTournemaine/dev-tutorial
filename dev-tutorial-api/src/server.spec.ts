/* eslint-disable no-invalid-this */
import { expect } from 'chai';
import { server } from './server';
import { DockerService, TtyLog } from './services/docker/docker';
import { agent as request } from 'supertest';
import { environment } from './environments/environment';
import { app } from './app';
import * as io from 'socket.io-client';
import * as fs from 'fs';
import * as debug from 'debug';
import { SocketManager } from './services/socket/socket';
import { Done } from 'mocha';

const logger = debug('test:server');

/**
 * Allow to handle multiple "done" callbacks.
 */
class PartialDone {
  private value = 0;

  constructor(private expected: number, private _done: Done) { }

  done(err?: any): void {
    if (err) {
      return this._done(new Error(`error at ${this.value}/${this.expected}, reason: ${err}`));
    }
    logger('%d of %d done', this.value + 1, this.expected);
    if (++this.value == this.expected) {
      this._done();
    }
  }
}
const partial = (expected: number, done: Done): PartialDone => {
  return new PartialDone(expected, done);
};


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

describe('Server integration tests', function () {
  it('should the server starts', () => {
    expect(server.listening).to.be.true;
  });

  describe('Socket integration', function () {
    this.timeout(10000);

    let socket: any;
    const tutoId = 'dev';

    before(async function () {
      this.timeout(30000);
      await DockerService.connect(environment.docker).run(tutoId);
    });

    beforeEach(() => {
      socket = io('http://localhost:3000');
    });

    xit('should attaching a socket to a docker container and get some commands results', function (done) {
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
        expect(id).to.equals(tutoId);
        part.done();

        socket.emit('cmd', 'uname\r');
      });
      socket.emit('attach', tutoId);
    });


    xit('should attaching a socket to a docker container and get some commands results after a reconnection', function (done) {
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

    it('should attaching a socket to a docker container and test \'edit\' hook', function (done) {
      const part = partial(3, done);

      socket.on('ttylog', (ttylog: TtyLog) => {
        part.done('should not got ttylog on edit hook: ' + ttylog.toString());
      });
      socket.on('edit-start', (info: any) => {
        socket.on('edit-content', (chunk: string) => {
          expect(chunk).not.to.be.undefined;
          part.done();
        });
        socket.on('edit-error', (err: string) => {
          part.done('should not receive an error:' + err);
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
      socket.emit('attach', tutoId);
    });

    it('should attaching a socket to a docker container and test \'edit\' hook error handling', function (done) {
      const part = partial(2, done);

      socket.on('edit-start', (info: any) => {
        socket.on('edit-content', () => {
          done('stderr should be handle by edit-error');
        });
        socket.on('edit-error', (err: any) => {
          expect(err).not.to.be.undefined;
        });
        socket.on('edit-close', () => {
          part.done();
        });

        expect(info).to.have.property('path');
        expect(info.path).not.to.be.undefined;
        part.done();
      });
      socket.on('attached', () => {
        socket.emit('cmd', 'edit testfile.txt\r');
      });
      socket.emit('attach', tutoId);
    });

    it('should send an error when trying to attach a socket to a non existent docker container', function (done) {
      socket.on('attached', () => {
        done('Should not be attached to void');
      });
      socket.on('err', (err: any) => {
        expect(err).to.have.property('name');
        expect(err).to.have.property('message');
        done();
      });
      socket.emit('attach', 'not exist');
    });

    xit('should complete the demo tutorial', function (done) {
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
              request(app)
                .post('/tuto/dev/write?path=' + encodeURI('/root/test.txt'))
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

    afterEach(() => {
      socket.disconnect();
      SocketManager.destroy();
    });
  });

  /**
   * Close the server properly at the end of tests
   */
  //after((done) => {
  //  server.on('close', () => done());
  //  server.close();
  //});
});
