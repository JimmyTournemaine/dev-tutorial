import * as path from 'path';
import { DockerService } from '../docker/docker';
import { DemuxStream } from '../docker/stream';
import { ISocketService } from './socket-interface';
import { Hook } from './hook';

export class HookFactory {
  static createHooks(service: ISocketService): Hook[] {
    return [
      this.createEditHook(service),
    ];
  }

  private static createEditHook(service: ISocketService): Hook {
    return new Hook({
      name: 'edit',
      regexp: /^edit (\/?(?:[^/ ]\/?)+)/,
      cancel: true,
      action: (edit: RegExpExecArray): Promise<void> => new Promise<void>((resolve, reject) => {
        const filepath = path.join(service.wd, edit[1]);

        // Send filecontent threw the socket
        service.socket.emit('edit-start', { path: filepath });
        DockerService.getInstance().exec(service.tutoId, `[ -f '${filepath}' ] && cat ${filepath} || >&2 echo 'No such file'`)
          .then((stream: DemuxStream) => {
            stream.onErr((chunk: Buffer|string) => service.socket.emit('edit-error', chunk.toString()));
            stream.onOut((chunk: Buffer|string) => service.socket.emit('edit-content', chunk.toString()));
            stream.onClose(() => { service.socket.emit('edit-close'); resolve(); });
          })
          .catch((reason) => reject(reason));
      }),
    });
  }
}
