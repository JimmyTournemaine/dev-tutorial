import * as debug from 'debug';
import { TtyLog } from '../../docker/ttylog';
import { PostValidator } from './validator-post';
import { PreValidator } from './validator-pre';

const logger = debug('app:validation');

/**
 * A set of validators.
 * Has 1 pre-validator and a list of validators.
 */
export class ValidatorSet {
  prevalidator: PreValidator;

  prevalidated = false;

  validators: PostValidator<unknown>[];

  validated = 0;

  constructor(prevalidator: PreValidator, validators: PostValidator<unknown>[]) {
    this.prevalidator = prevalidator;
    this.validators = validators;
  }

  /**
   * Pre-validation of the given command.
   *
   * @param cmd The command to prevalidate
   * @returns Is valid.
   */
  prevalidate(cmd: string): boolean {
    logger('prevalidation started', cmd);

    // optionnal prevalidation (but preferrable)
    this.prevalidated = this.prevalidator ? this.prevalidator.validate(cmd) : true;

    logger('prevalidation completed', this.prevalidated);

    return this.prevalidated;
  }

  /**
   * Validate an output with its ttylog.
   *
   * @param output The commnd output.
   * @param ttylog The TTYLOG of the command.
   */
  async validate(output: string, ttylog: TtyLog): Promise<void> {
    if (this.prevalidated) {
      logger('validation started');
      await this.validating(output, ttylog);
    } else {
      logger('validation skipped');
    }
  }

  /**
   * Validation process of the previous method.
   *
   * @param output The commnd output.
   * @param ttylog The TTYLOG of the command.
   * @returns A promise of validation results.
   */
  private validating(output: string, ttylog: TtyLog): Promise<boolean[]> {
    const validatorsInProcess: Promise<boolean>[] = [];
    for (const validator of this.validators) {
      if (validator.canValidate()) {
        const process = Promise.resolve(validator.isValid({ output, ttylog })).then((valid) => {
          if (valid) {
            this.validated++;
            logger('%s is valid (validated=%d/%s)', validator.constructor.name, this.validated, this.validators.length);
          } else {
            logger('%s is NOT valid (validated=%d/%s)', validator.constructor.name, this.validated, this.validators.length);
          }
          return valid;
        });
        validatorsInProcess.push(process);
      }
    }

    return Promise.all(validatorsInProcess);
  }

  /**
   * Test if the set is valid.
   * A set is considered valid if it has been prevalidated and all validators are passed.
   *
   * @returns The validation state.
   */
  isValid(): boolean {
    logger('is valid ? pre=%s, post=%s/%s', this.prevalidated, this.validated, this.validators.length);
    return this.prevalidated && this.validated === this.validators.length;
  }
}
