import { expect } from 'chai';
import * as sinon from 'sinon';
import { PassThrough } from 'stream';
import { DockerService } from '../../docker/docker';
import { DemuxStream } from '../../docker/stream';
import { SocketService } from '../../socket/socket';
import { CreatesValidator } from '../docker/creates-validator';
import { ExitCodeValidator } from '../exit-code/exit-code-validator';
import { ValidatorDescriptorsParser } from './validator-parser';
import { ValidatorFactory } from './validator-factory';
import { PreValidator } from './validator-pre';

class PassThroughDemuxStream extends DemuxStream {
  constructor(mainStream: PassThrough) {
    super(mainStream);

    const stdout = new PassThrough();
    const stderr = new PassThrough();

    this.mainStream
      .pipe(stdout)
      .on('end', () => {
        stdout.end();
        stderr.end();
      });

    this.stdout = stdout;
    this.stderr = stderr;
  }

  /**
   * @override
   */
  onClose(listener: () => void): this {
    this.mainStream.on('finish', listener);

    return this;
  }
}

describe('Validation', () => {
  const ttylogExample = {
    cmd: 'ls -l', user: 'root', workdir: '/', exitCode: 0,
  };

  describe('Pre-Validation', () => {
    it('should pre-validate a command', () => {
      const validator = ValidatorFactory.create(PreValidator, { cmd: 'git --version' });

      const validation = validator.validate('git --version');
      expect(validation).to.be.true;
    });
    it('should not pre-validate a not matching command', () => {
      const validator = ValidatorFactory.create(PreValidator, { cmd: 'git --version' });

      const validation = validator.validate('ls -l');
      expect(validation).to.be.false;
    });
    it('should pre-validate a command with too much blanks', () => {
      const validator = ValidatorFactory.create(PreValidator, { cmd: 'git --version' });

      const validation = validator.validate('git   --version');
      expect(validation).to.be.true;
    });
    // it('should pre-validate a command with options regardless the order', async function () {
    //   const validator = ValidatorFactory.create(PreValidator, {cmd: 'chmod -R 777 /tmp/file.txt'});

    //   let validation = await validator.isValid('chmod 777 -R /tmp/file.txt');
    //   expect(validation).to.be.true;
    // });
    // it('should pre-validate a command with options regardless the order #2', async function () {
    //   const validator = ValidatorFactory.create(PreValidator, {cmd: 'docker exec -it test bash'});

    //   let validation = await validator.isValid('docker exec -ti test bash');
    //   expect(validation).to.be.true;
    // });
    // it('should pre-validate a command with options regardless the order #3', async function () {
    //   const validator = ValidatorFactory.create(PreValidator, {cmd: 'test --option=1 --option 2'});

    //   let validation = await validator.isValid('test --option 1 --option 2');
    //   expect(validation).to.be.true;

    //   validation = await validator.isValid('test --option=1 --option=2');
    //   expect(validation).to.be.true;

    //   validation = await validator.isValid('test --option 1 --option=2');
    //   expect(validation).to.be.true;

    //   validation = await validator.isValid('test --option 2 --option 1');
    //   expect(validation).to.be.true;

    //   validation = await validator.isValid('test --option=2 --option=1');
    //   expect(validation).to.be.true;

    //   validation = await validator.isValid('test --option 2 --option=1');
    //   expect(validation).to.be.true;
    // });
  });
  describe('Post-Validation', () => {
    it('should validate command exit code', async () => {
      const validator = ValidatorFactory.create(ExitCodeValidator, { exitCode: 0 });

      // Validation
      const validation = await validator.validate({ ttylog: ttylogExample });
      expect(validation).to.be.true;
    });
    it('should validate a file creation', async () => {
      const serviceStub = sinon.createStubInstance(SocketService);
      const dockerStub = sinon.createStubInstance(DockerService);
      dockerStub.exec.returns(new Promise((resolve) => {
        const stdout = new PassThrough();
        const stream = new PassThroughDemuxStream(stdout);

        setTimeout(() => {
          stdout.end('OK');
        }, 500);

        resolve(stream);
      }));

      const validator = ValidatorFactory.create(CreatesValidator, { type: 'file', path: 'test.txt' }, serviceStub);
      validator.setDockerService(dockerStub);

      // Validation
      const validation = await validator.validate();
      expect(validation).to.be.true;

      // Validation (with dumb extra args)
      // validation = await validator.isValid(ttylogExample);
      // expect(validation).to.be.true;
      // validation = await validator.isValid(outputExample);
      // expect(validation).to.be.true;
    });
  });
  describe('Validation parser', () => {
    it('should parse validator successfully', (done) => {
      const serviceStub = sinon.createStubInstance(SocketService);
      const descriptor = [{
        input: { cmd: 'git --version' },
        rc: { exitCode: 0 },
      }];

      const validators = ValidatorDescriptorsParser.create(serviceStub, descriptor);
      validators.on('valid', () => {
        done();
      });
      expect(validators).to.have.property('sequence');

      const prevalidated = validators.preValidate('git --version');
      expect(prevalidated).to.be.true;

      void validators.validate(undefined, ttylogExample);
    });
    it('should parse validator successfully without waiting', (done) => {
      const serviceStub = sinon.createStubInstance(SocketService);
      const descriptor = [{
        input: { cmd: 'git --version' },
        rc: { exitCode: 0 },
      }];

      const validators = ValidatorDescriptorsParser.create(serviceStub, descriptor);
      validators.on('valid', () => {
        done();
      });
      expect(validators).to.have.property('sequence');

      const prevalidated = validators.preValidate('git --version');
      expect(prevalidated).to.be.true;

      void validators.validate(undefined, ttylogExample);
    });
    it('should use the parser', () => {
      const validator = new PreValidator({ cmd: 'ls' });

      validator.validate('ls -l  ');
      validator.validate(' git add  README.md ');
      validator.validate('git commit  -m "my commit message"');
      validator.validate('git commit -a -m "my commit message to commit all modified"');
      validator.validate('git commit -am   "my commit message to commit all modified"');
      validator.validate('git push origin master');
      validator.validate('ansible-playbook  playbooks/test.yml');
      validator.validate(' ansible-playbook playbooks/test.yml -l vougeot -e @test.json --tags=test');
      validator.validate('echo "$HOME/test" > /dev/null 2>error.log');
      validator.validate('cat myfile.text | tee -e file.log');
    });
  });
});