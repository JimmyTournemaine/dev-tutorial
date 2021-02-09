import * as debug from 'debug';
import * as path from 'path';
import { DemuxStream, DockerService } from '../docker/docker';
import { SocketService } from './socket';

const logger = debug('app:hook');

interface HookOptions {
  name: 'edit';
  regexp: RegExp;
  cancel: boolean;
  action: (res: RegExpExecArray) => Promise<any>;
}

export class Hook {
  constructor(private options: HookOptions) { }

  test(cmd: string): boolean {
    return this.options.regexp.test(cmd);
  }

  shouldCancel(): boolean {
    return this.options.cancel;
  }

  async process(cmd: string): Promise<any> {
    logger(`processing ${this.options.name}`);
    return this.options.action(this.options.regexp.exec(cmd));
  }
}

export class HookFactory {
  static createHooks(service: SocketService): Hook[] {
    return [
      this.createEditHook(service)
    ];
  }

  private static createEditHook(service: SocketService): Hook {
    return new Hook({
      name: 'edit',
      regexp: /^edit (\/?(?:[^/ ]\/?)+)/,
      cancel: true,
      action: (edit: RegExpExecArray): Promise<any> => {
        return new Promise<void>((resolve, reject) => {
          const filepath = path.join(service.wd, edit[1]);

          // Send filecontent threw the socket
          service.socket.emit('edit-start', { path: filepath });
          DockerService.getInstance().exec(service.tutoId, `[ -f '${filepath}' ] && cat ${filepath} || >&2 echo 'No such file'`)
            .then((stream: DemuxStream) => {
              stream.onErr((chunk: any) => service.socket.emit('edit-error', chunk.toString()));
              stream.onOut((chunk: any) => service.socket.emit('edit-content', chunk.toString()));
              stream.onClose(() => { service.socket.emit('edit-close'); resolve(); });
            })
            .catch((reason) => reject(reason));
        });
      }
    });
  }
}
