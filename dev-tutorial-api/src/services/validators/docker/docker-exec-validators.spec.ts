import * as sinon from 'sinon';
import { expect } from 'chai';
import { PassThrough } from 'stream';
import { DockerExecValidator } from './docker-exec-validator';
import { DockerService, IDockerService } from '../../docker/docker';
import { PassThroughDemuxStream } from '../../../utils/demux-stream-passthrough.test';

class FakeDockerExecValidator extends DockerExecValidator<void> {
  private shouldValidate: boolean;

  constructor(cmd: string, docker: IDockerService, shouldValidate = true) {
    super(cmd);
    this.shouldValidate = shouldValidate;
    this.setDockerService(docker);
  }

  protected isStdoutValid(): Promise<boolean> {
    return Promise.resolve(this.shouldValidate);
  }
}

describe('Validation: Docker exec', () => {
  it('should validate an expected output', async () => {
    // MOCK
    const dockerStub = sinon.createStubInstance(DockerService);
    dockerStub.exec.returns(new Promise((resolve) => {
      const stdout = new PassThrough();
      const stream = new PassThroughDemuxStream(stdout);

      setTimeout(() => {
        stdout.end('I\'m a fake return of docker exec');
      }, 200);

      resolve(stream);
    }));

    // GIVEN
    const validator = new FakeDockerExecValidator('ls -l', dockerStub);

    // WHEN
    const res = await validator.validate();

    // THEN
    expect(res).to.equal(true);
    expect(dockerStub.exec.calledOnce).to.equal(true);
  });
  it('should not validate an unexpected output', async () => {
    // MOCK
    const dockerStub = sinon.createStubInstance(DockerService);
    dockerStub.exec.returns(new Promise((resolve) => {
      const stdout = new PassThrough();
      const stream = new PassThroughDemuxStream(stdout);

      setTimeout(() => {
        stdout.end('I\'m a fake return of docker exec');
      }, 200);

      resolve(stream);
    }));

    // GIVEN
    const validator = new FakeDockerExecValidator('ls -l', dockerStub, false);

    // WHEN
    const res = await validator.validate();

    // THEN
    expect(res).to.equal(false);
    expect(dockerStub.exec.calledOnce).to.equal(true);
  });
});
