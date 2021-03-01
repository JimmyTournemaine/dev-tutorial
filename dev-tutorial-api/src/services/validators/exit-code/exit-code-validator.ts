import { PostValidationParameters, PostValidator } from '../abstract/validator-post';

interface ExitCodeValidatorOptions {
  exitCode: number;
}

export class ExitCodeValidator extends PostValidator<ExitCodeValidatorOptions> {
  validate(params: PostValidationParameters): Promise<boolean> {
    return Promise.resolve(params.ttylog.exitCode === this.options.exitCode);
  }
}
