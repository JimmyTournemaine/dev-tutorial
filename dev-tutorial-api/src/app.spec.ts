import { expect } from 'chai';
import { app } from './app';
import { agent as request } from 'supertest';
import * as fs from 'fs';
import { DemuxStream, DockerService } from './services/docker/docker';
import { TutorialService } from './services/tutorial/tutorial';
import { environment } from './environments/environment';

describe('REST API Tests', function () {

  before('reinit defaults services values', function () {
    TutorialService.init();
    DockerService.connect(environment.docker);
  });

  it('should get 404 on non existing path', async function () {
    const res = await request(app).get('/api');
    expect(res.status).to.equal(404);
  });

  it('should get a public asset from a tutorial', async function () {
    const res = await request(app).get('/api/tuto/dev/static/icon.png');
    expect(res.status).to.equal(200);
  });

  it('should list all tutorials', async function () {
    const res = await request(app).get('/api/tuto');

    expect(res.status).to.equal(200);
    expect(res.body).not.to.be.empty;
    expect(res.body).to.be.an('Array');
    expect(res.body).to.have.lengthOf(3);

    res.body.forEach((tuto: unknown) => {
      expect(tuto).to.have.property('name');
      expect(tuto).to.have.property('resume');
      expect(tuto).to.have.property('slug');
      expect(tuto).to.have.property('description');
      expect(tuto).to.have.property('slides');
    });
  });

  it('should list matching tutorials', async function () {
    const res = await request(app).post('/api/tuto/search').send({ search: 'dev' });

    expect(res.status).to.equal(200);
    expect(res.body).not.to.be.empty;
    expect(res.body).to.be.an('Array');
    expect(res.body).to.have.lengthOf(2);

    res.body.forEach((tuto: unknown) => {
      expect(tuto).to.have.property('name');
      expect(tuto).to.have.property('resume');
      expect(tuto).to.have.property('slug');
      expect(tuto).to.have.property('description');
      expect(tuto).to.have.property('slides');
    });
  });

  it('should get a tutorial slides content', async function () {
    const res = await request(app).get('/api/tuto/dev');

    expect(res.ok);
    expect(res.body).not.to.be.empty;
    expect(res.body).to.be.an('Array');
    res.body.forEach((content: unknown) => {
      expect(content).not.to.be.empty;
      expect(content).to.have.length.greaterThan(30);
    });
  });

  it('should respond 404 on unknown tutorial', async function () {
    const res = await request(app).get('/api/tuto/not-exists');

    expect(res.status).to.equal(404);
  });

  it('should get a tutorial slide content', async function () {
    const res = await request(app).get('/api/tuto/dev/slides/1');

    expect(res.ok);
    expect(res.text).not.to.be.empty;
    expect(res.text).to.have.length.greaterThan(30);
  });

  it('should get 404 on unknown slide id of a tutorial', async function () {
    const res = await request(app).get('/api/tuto/dev/slides/3');

    expect(res.status).to.equal(404);
  });

  it('should respond 404 on unknown tutorial', async function () {
    const res = await request(app).get('/api/tuto/not-exists/slides/1');

    expect(res.status).to.equal(404);
  });

  it('should start the given tutorial docker container', async function () {
    this.timeout(60000);

    // Start request should send 202 (Accepted)
    const start = await request(app).post('/api/tuto/dev/start');
    expect(start.status).to.equal(202);
    expect(start.headers).to.have.property('location');
    expect(start.body).to.be.an('object');
    expect(start.body).to.have.property('message').that.equal('Accepted');

    // Status request should send 200 (OK) = processing
    const status = await request(app).get(start.headers.location);
    expect(status.status).to.equal(200);

    // When the container is ready, status request should send 201 (Created)
    await new Promise<void>((resolve, reject) => {
      // Wait for 201 Created
      const interval = setInterval(async () => {
        const status = await request(app).get(start.headers.location);

        if (status.status == 201) {
          clearInterval(interval);
          resolve();
        }
      }, 3000);
      // Reject and clear on mocha test timeout
      setTimeout(() => {
        clearInterval(interval);
        reject();
      }, this.timeout());
    });
  });
  it('should write a file in a docker container', function (done) {
    this.timeout(50000);

    // GIVEN
    request(app).post('/api/tuto/dev/start').expect(202)
      .then(() => new Promise((resolve) => setTimeout(resolve, 20000))
        .then(() => request(app).get('/api/tuto/dev/status').expect(201))
        // WHEN
        .then(async () => {
          await request(app)
            .post('/api/tuto/dev/write?path=' + encodeURI('/root/test-write-request.txt'))
            .set('content-type', 'application/octet-stream')
            .send(fs.readFileSync('./test/test-file.txt'))
            .expect(204);
        })
        // THEN
        .then(() => DockerService.getInstance().exec('dev', 'cat /root/test-write-request.txt'))
        .then((stream: DemuxStream) => {
          const chunks = [];
          stream.onOut((data: Buffer) => { chunks.push(data); });
          stream.onErr((err: string|Error) => {
            if (!(err instanceof Error)) {
              err = new Error(err);
            }
            done(err);
          });
          stream.onClose(() => {
            const expected = 'This file should be extracted in a container during a test';
            const catResult = Buffer.concat(chunks).toString();
            expect(catResult).to.equals(expected);
            done();
          });
        }))
      .catch(done);
  });
  xit('should got an error trying to write a file in a docker container that do not exist', async function () {
    await request(app)
      .post('/api/tuto/test/write?path=' + encodeURI('/root/test-write-request.txt'))
      .set('content-type', 'application/octet-stream')
      .attach('file', './test/test-file.txt')
      .expect(404);
  });
  it('should got an error trying to write a file in a docker container that is not started (= not currently used)', async function () {
    await request(app)
      .post('/api/tuto/git/write?path=' + encodeURI('/root/test-write-request.txt'))
      .set('content-type', 'application/octet-stream')
      .attach('file', './test/test-file.txt')
      .expect(409);
  });
});
