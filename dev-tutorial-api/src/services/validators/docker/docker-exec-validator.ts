import { DockerService, IDockerService } from '../../docker/docker';
import { ISocketService } from '../../socket/socket-interface';
import { PostValidator } from '../abstract/validator-post';

/*
  DOCKER
  Execute a command in the docker container to validate something
*/
type DockerExecValidatorOptions = unknown;

/**
 * Execute a command in a docker container to validate something.
 */
export abstract class DockerExecValidator<O extends DockerExecValidatorOptions> extends PostValidator<O> {
  private command: string;

  private tutoId: string;

  private docker: IDockerService;

  constructor(command: string, options: O) {
    super(options);
    this.command = command;
  }

  setDockerService(docker: IDockerService): void {
    this.docker = docker;
  }

  getDockerService(): IDockerService {
    return (this.docker) ? this.docker : DockerService.getInstance();
  }

  injectService(service: Readonly<ISocketService>): void {
    this.tutoId = service.tutoId;
  }

  async validate(): Promise<boolean> {
    const stream = await this.getDockerService().exec(this.tutoId, this.command);

    return new Promise((resolve, reject) => {
      const buffers = [];
      stream.onErr((chunk: Buffer | string) => reject(new Error(`exec err: ${chunk.toString()}`)));
      stream.onOut((chunk: Buffer | string) => buffers.push(chunk));
      stream.onClose(() => {
        const stdout = Buffer.concat(buffers).toString();
        resolve(this.isStdoutValid(stdout.trim()));
      });
    });
  }

  protected abstract isStdoutValid(stdout: string): Promise<boolean>;
}
