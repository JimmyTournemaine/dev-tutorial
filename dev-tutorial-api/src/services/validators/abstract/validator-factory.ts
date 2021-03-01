import { ISocketService } from '../../socket/socket-interface';
import { Validator } from './validator-abstract';
import { ValidatorConstructor } from './validator-constructor';

export class ValidatorFactory {
  static create<O, P, R, T extends Validator<O, P, R>>(type: ValidatorConstructor<O, T>, options: O, service?: ISocketService): T {
    // eslint-disable-next-line new-cap
    const instance = new type(options);
    if (service && instance.injectService) {
      instance.injectService(service);
    }
    return instance;
  }
}
