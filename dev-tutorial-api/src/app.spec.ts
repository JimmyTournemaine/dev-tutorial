/* eslint-disable func-names */
import { expect } from 'chai';
import { agent as request } from 'supertest';
import * as fs from 'fs';
import { RequestListener } from 'http';
import { DockerService } from './services/docker/docker';
import { DemuxStream } from './services/docker/stream';
import { Server } from './server';
import { User } from './models/user';
import { Token } from './models/token';

/**
 * Create a new user
 *
 * @param app The application
 * @param username A username. If not provided, a randomly generated username will be created.
 * @returns A promise of the decoded token.
 */
export async function createUser(app: RequestListener, username?: string): Promise<{ accessToken: Token, refreshToken: string; }> {
  const res = await request(app).post('/api/user').send({
    username: username || Date.now().toString()
  });

  expect(res.status).to.equal(201);
  expect(res.body).to.have.property('userId');
  expect(res.body).to.have.property('token');

  const cookies = (res.headers as unknown[])['set-cookie'] as string[];
  expect(cookies).to.be.an('array').with.length.greaterThan(0);
  expect(cookies).to.match(/^refresh_token/);

  return { accessToken: (res.body as Token), refreshToken: cookies[0] };
}

describe('[IT] REST API Tests', () => {
  let server: Server;
  let app: RequestListener;

  before('starts the server', async () => {
    server = new Server();
    await server.boot();
    app = server.app;
  });

  after('stop the server', async function () {
    this.timeout(10000);
    await server.stop();
  });

  describe('User API', () => {
    beforeEach(async () => { await User.deleteMany({}).exec(); });

    it('should create a user', async () => {
      await createUser(app, 'user-test1');

      // User already exists
      const errRes = await request(app).post('/api/user').send({
        username: 'user-test1'
      });
      expect(errRes.status).to.equal(400);

      // random user
      await createUser(app);
    });

    it('should refresh a user token', async () => {
      const username = 'user-test2';
      const { accessToken, refreshToken } = await createUser(app, username);

      const res = await request(app)
        .put('/api/user/refresh')
        .set('Cookie', refreshToken)
        .send({ username, userId: accessToken.userId });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('userId');
      expect(res.body).to.have.property('token');
      const body = res.body as Token;
      expect(body.token).not.to.equal(accessToken.token);
      expect(body.userId).to.equal(accessToken.userId);
    });

    it('should not refresh a user token with missing refresh token', async () => {
      const username = 'user-test2';
      const { accessToken } = await createUser(app, username);

      const res = await request(app)
        .put('/api/user/refresh')
        .send({ username, userId: accessToken.userId });

      expect(res.status).to.equal(401);
    });

    it('should not refresh a user token with invalid or expired refresh token', async () => {
      const username = 'user-test2';
      const { accessToken } = await createUser(app, username);

      const res = await request(app)
        .put('/api/user/refresh')
        .set('Cookie', 'refresh_token=thisisnotarealrefreshtoken')
        .send({ username, userId: accessToken.userId });

      expect(res.status).to.equal(401);
    });

    it('should not impersonate access token using a refresh token', async () => {
      const { accessToken } = await createUser(app, 'user-test1');
      const { refreshToken } = await createUser(app, 'user-test2');

      const res = await request(app)
        .put('/api/user/refresh')
        .set('Cookie', refreshToken)
        .send({ username: 'user-test1', userId: accessToken.userId });

      expect(res.status).to.equal(403);
    });

    it('should not refresh a token when the user is not created', async function () {
      this.timeout(15000);

      const username = 'user-test12';

      const res = await request(app)
        .put('/api/user/refresh')
        .send({ username, userId: username });

      expect(res.status).to.equal(404);
    });
  });

  describe('Tutorial API', () => {
    let token: Token;

    beforeEach(async () => {
      ({ accessToken: token } = await createUser(app));
    });

    /**
     * Validate a tutorial object
     *
     * @param tuto The tutorial to validate.
     */
    function validateTuto(tuto: unknown) {
      expect(tuto).to.have.property('name');
      expect(tuto).to.have.property('resume');
      expect(tuto).to.have.property('slug');
      expect(tuto).to.have.property('description');
      expect(tuto).to.have.property('slides');
    }

    it('should get 404 on non existing path', async () => {
      const res = await request(app).get('/api');
      expect(res.status).to.equal(404);
    });

    it('should get a public asset from a tutorial', async () => {
      const res = await request(app).get('/api/tuto/dev/static/icon.png');
      expect(res.status).to.equal(200);
    });

    it('should get a not found response for public asset from non existent tutorial', async () => {
      const res = await request(app).get('/api/tuto/oops/static/icon.png');
      expect(res.status).to.equal(404);
    });

    it('should list all tutorials', async () => {
      const res = await request(app).get('/api/tuto');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array').with.length.greaterThan(0);
      expect(res.body).to.be.an('Array');
      expect(res.body).to.have.lengthOf(3);

      (res.body as unknown[]).forEach((tuto: unknown) => validateTuto(tuto));
    });

    it('should list matching tutorials', async () => {
      const res = await request(app).post('/api/tuto/search').send({ search: 'dev' });

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array').with.length.greaterThan(0);
      expect(res.body).to.be.an('Array');
      expect(res.body).to.have.lengthOf(2);

      (res.body as unknown[]).forEach((tuto: unknown) => validateTuto(tuto));
    });

    it('should not list matching tutorials on malformed request', async () => {
      const res = await request(app).post('/api/tuto/search').send({});
      expect(res.status).to.equal(400);
    });

    it('should get some tutorial details', async () => {
      const res = await request(app).get('/api/tuto/dev').set('Authorization', `Bearer ${token.token}`);

      expect(res.ok);
      expect(res.body).to.be.an('array').with.length.greaterThan(0);
      (res.body as unknown[]).forEach((content: unknown) => {
        expect(content).to.be.a('string').with.length.greaterThan(0);
        expect(content).to.have.length.greaterThan(30);
      });
    });

    it('should respond 404 on unknown tutorial', async () => {
      const res = await request(app).get('/api/tuto/not-exists').set('Authorization', `Bearer ${token.token}`);

      expect(res.status).to.equal(404);
    });

    it('should get a tutorial slide content', async () => {
      const res = await request(app).get('/api/tuto/dev/slides/1').set('Authorization', `Bearer ${token.token}`);

      expect(res.ok);
      expect(res.text).to.have.length.greaterThan(30);
    });

    it('should get 404 on unknown slide id of a tutorial', async () => {
      const res = await request(app).get('/api/tuto/dev/slides/3').set('Authorization', `Bearer ${token.token}`);

      expect(res.status).to.equal(404);
    });

    it('should respond 404 on unknown tutorial', async () => {
      const res = await request(app).get('/api/tuto/not-exists/slides/1').set('Authorization', `Bearer ${token.token}`);

      expect(res.status).to.equal(404);
    });

    it('should start and stop the given tutorial docker container', async function () {
      this.timeout(60000);

      interface StartResponse {
        status: number;
        headers: { location: string; };
        body: { message: string; };
      }

      // Start request should send 202 (Accepted)
      const start = await request(app).post('/api/tuto/dev/start').set('Authorization', `Bearer ${token.token}`) as StartResponse;
      expect(start.status).to.equal(202);
      expect(start.headers).to.have.property('location');
      expect(start.body).to.be.an('object');
      expect(start.body).to.have.property('message').that.equal('Accepted');

      // Status request should send 200 (OK) = processing
      const status = await request(app).get(start.headers.location).set('Authorization', `Bearer ${token.token}`);
      expect(status.status).to.equal(200);

      // When the container is ready, status request should send 201 (Created)
      await new Promise<void>((resolve, reject) => {
        // Wait for 201 Created
        const interval = setInterval(() => {
          void request(app).get(start.headers.location).set('Authorization', `Bearer ${token.token}`)
            .then((statusLocation) => {
              if (statusLocation.status === 201) {
                clearInterval(interval);
                resolve();
              }
            });
        }, 3000);
        // Reject and clear on mocha test timeout
        setTimeout(() => {
          clearInterval(interval);
          reject();
        }, this.timeout());
      });

      const stop = await request(app).delete('/api/tuto/dev/stop').set('Authorization', `Bearer ${token.token}`);
      expect(stop.status).to.equal(204);
    });

    it('should got 404 response when trying to start container of tuto that does not exist', async () => {
      const start = await request(app).post('/api/tuto/oops/start').set('Authorization', `Bearer ${token.token}`);
      expect(start.status).to.equal(404);
    });

    it('should got 404 response when trying to stop container of tuto that does not exist', async () => {
      const start = await request(app).delete('/api/tuto/oops/stop').set('Authorization', `Bearer ${token.token}`);
      expect(start.status).to.equal(404);
    });

    it('should write a file in a docker container', function (done) {
      this.timeout(50000);

      // GIVEN
      request(app).post('/api/tuto/dev/start').set('Authorization', `Bearer ${token.token}`).expect(202)
        .then(() => new Promise((resolve) => setTimeout(resolve, 20000))
          .then(() => request(app).get('/api/tuto/dev/status').set('Authorization', `Bearer ${token.token}`).expect(201))
          // WHEN
          .then(async () => {
            await request(app)
              .post(`/api/tuto/dev/write?path=${encodeURI('/root/test-write-request.txt')}`)
              .set('Authorization', `Bearer ${token.token}`)
              .set('Content-Type', 'application/octet-stream')
              .send(fs.readFileSync('./test/test-file.txt'))
              .expect(204);
          })
          // THEN
          .then(() => DockerService.getInstance().exec('dev', 'cat /root/test-write-request.txt'))
          .then((stream: DemuxStream) => {
            const chunks = [];
            stream.onOut((data: Buffer) => { chunks.push(data); });
            stream.onErr((err: Buffer) => done(new Error(err.toString())));
            stream.onClose(() => {
              const expected = 'This file should be extracted in a container during a test';
              const catResult = Buffer.concat(chunks).toString();
              expect(catResult).to.equals(expected);
              done();
            });
          }))
        .catch(done);
    });
    it('should got an error trying to write a file in a docker container that do not exist', async () => {
      await request(app)
        .post(`/api/tuto/test/write?path=${encodeURI('/root/test-write-request.txt')}`)
        .set('Authorization', `Bearer ${token.token}`)
        .set('Content-Type', 'application/octet-stream')
        .attach('file', './test/test-file.txt')
        .expect(404);
    });
    it('should got an error trying to write a file in a docker container that is not started (= not currently used)', async () => {
      await request(app)
        .post(`/api/tuto/git/write?path=${encodeURI('/root/test-write-request.txt')}`)
        .set('Authorization', `Bearer ${token.token}`)
        .set('Content-Type', 'application/octet-stream')
        .attach('file', './test/test-file.txt')
        .expect(409);
    });
    it('should write a file in a docker container', function (done) {
      this.timeout(50000);

      // GIVEN
      void request(app)
        .post('/api/tuto/dev/start')
        .set('Authorization', `Bearer ${token.token}`)
        .expect(202)
        .then(() => new Promise((resolve) => setTimeout(resolve, 20000))
          .then(() => request(app).get('/api/tuto/dev/status').set('Authorization', `Bearer ${token.token}`).expect(201))
          .then(() => request(app)
            .post('/api/tuto/dev/write')
            .set('Authorization', `Bearer ${token.token}`)
            .set('Content-Type', 'application/octet-stream')
            .send(fs.readFileSync('./test/test-file.txt'))
            .expect(400))
          .then(() => request(app)
            .post('/api/tuto/dev/write')
            .set('Authorization', `Bearer ${token.token}`)
            .set('Content-Type', 'application/octet-stream')
            .send(fs.readFileSync('./test/test-file.txt'))
            .expect(400))
          .then(() => done())
          .catch(done))
        .catch(done);
    });
  });
});
