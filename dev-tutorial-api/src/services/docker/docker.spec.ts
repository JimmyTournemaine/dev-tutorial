import { expect } from 'chai';
import { describe } from 'mocha';
import * as fs from 'fs';
import { debug } from 'debug';
import { DockerService as docker } from './docker';
import { DemuxStream } from './stream';
import { environment } from '../../environments/environment';

const logger = debug('test:docker');

describe('[IT] Docker Service', () => {
  describe('Docker service initialization', () => {
    it('should the docker service throw error without connection', () => {
      docker.disconnect();
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(() => docker.getInstance()).to.throw();
    });

    it('should the docker service works and be unique', () => {
      const service = docker.connect(environment.docker);
      expect(service).not.to.equal(undefined);

      const instance = docker.getInstance();
      expect(instance).not.to.equal(null);
      expect(instance).to.equals(service);
    });
  });

  describe('Docker basic container features', function runDockerFeatures() {
    this.timeout(120000);

    const tutoId = 'dev';

    before(() => docker.connect(environment.docker));
    beforeEach(async () => {
      await docker.getInstance().destroy(tutoId);
    });

    it('should start a tutorial container, then stop and remove it', async () => {
      // Start
      logger('starting');
      const container = await docker.getInstance().run(tutoId);
      expect(container).not.to.equal(undefined);
      expect(container).to.have.property('id');

      // Check start status
      logger('inspect');
      const inspect = await container.inspect();
      expect(inspect).to.have.nested.property('State.Status').that.equals('running');
      expect(inspect).to.have.nested.property('State.Running').that.equals(true);
      expect(inspect).to.have.nested.property('State.Dead').that.equals(false);

      // Stop/Remove
      logger('destroy');
      await docker.getInstance().destroy(tutoId);
    });
  });
  describe('Docker advanced container features', function runAdvancedFeatures() {
    this.timeout(120000);

    const tutoId = 'dev';

    before(() => docker.connect(environment.docker));

    beforeEach(async () => {
      await docker.getInstance().run(tutoId);
    });

    afterEach(async () => {
      await docker.getInstance().destroy(tutoId);
    });

    it('should write a file in the container', (done) => {
      // Write a file in the container
      void docker.getInstance().writeFile(tutoId, '/root/test_writeFile.txt', fs.createReadStream('./test/test-file.txt'))
        .then(() => {
          void docker.getInstance().exec(tutoId, 'cat /root/test_writeFile.txt').then((stream: DemuxStream) => {
            const chunks = [];
            stream.onOut((data: Buffer) => { chunks.push(data); });
            stream.onErr((err: string|Buffer) => done(new Error(err.toString())));
            stream.onClose(() => {
              const expected = 'This file should be extracted in a container during a test';
              const catResult = Buffer.concat(chunks).toString();
              expect(catResult).to.equals(expected);
              done();
            });
          });
        });
    });
  });
});
