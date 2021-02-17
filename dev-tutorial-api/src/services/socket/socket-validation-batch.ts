import { Validators } from '../validators/abstract/validators';
import { TtyLog } from '../docker/ttylog';

export class ValidationBatch {
  output = '';

  ttylog: TtyLog;

  async validate(validators: Validators): Promise<void> {
    if (this.ttylog && validators.preValidate(this.ttylog.cmd)) {
      await validators.validate(this.output, this.ttylog);
    }
  }
}
