import { TtyLog } from '../../docker/ttylog';
import { Validator } from './validator-abstract';

export interface PostValidationParameters {
  output?: string;
  ttylog?: TtyLog;
}

export abstract class PostValidator<O> extends Validator<O, PostValidationParameters, Promise<boolean>> {
  protected willValidate = true;

  async isValid(values: PostValidationParameters): Promise<boolean> {
    const isvalid = await this.validate(values);
    if (isvalid) {
      this.willValidate = false; // when completed once
    }
    return isvalid;
  }

  canValidate(): boolean {
    return this.willValidate;
  }

  abstract validate(values: PostValidationParameters): Promise<boolean>;
}
