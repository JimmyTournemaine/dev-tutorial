import { EventEmitter } from 'events';
import { TtyLog } from '../../docker/ttylog';
import { ValidatorSet } from './validator-set';
import { ValidatorSequence } from './validator-sequence';

/*

 MANAGERS

 Manage validators in sequence of validators set to complete.
 Wait for prevalidation to complete to listen others events and validate them.
 When a set is completed, the system listen the next one.
 When all sets have been completed, execute a given callback.
 Ex:
 [
   {
     input: '^mkdir',
     exitcode: 0,
   },
   {
     input: '^touch',
     creates: {type: directory, path: '/usr/src/my-project/README.md'}
   }
 ]

*/

export class Validators extends EventEmitter {
  private sequence: ValidatorSequence;

  private current: ValidatorSet;

  constructor(sequence: ValidatorSequence) {
    super();
    this.sequence = sequence;
    this.current = sequence.get();
  }

  preValidate(cmd: string): boolean {
    return this.current.prevalidate(cmd);
  }

  async validate(output: string, ttylog: TtyLog): Promise<void> {
    await this.current.validate(output, ttylog);

    if (this.current.isValid()) {
      if (this.sequence.hasNext()) {
        this.current = this.sequence.next();
      } else {
        this.emit('valid');
      }
    }
  }
}
