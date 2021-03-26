import { ISocketService } from '../../socket/socket-interface';
import { PreValidator } from './validator-pre';
import { Validators } from './validators';
import { ValidatorSequence } from './validator-sequence';
import { ValidatorSet } from './validator-set';
import { ValidatorFactory } from './validator-factory';
import { DescriptorMapping, descriptorMapping } from '../mapping';
import { LoggerFactory } from '../../logger/logger';

const logger = LoggerFactory.getLogger('app:validation:parser');

/**
 * Will generate generators from tutorials descriptor 'tutorial.json'.
 */
export class ValidatorDescriptorsParser {
  /**
   * Create a Validators instance for a tutorial slides using JSON description.
   *
   * @param service The SocketService.
   * @param descriptor A slide validators descriptor.
   * @returns The validators object.
   */
  static create(service: ISocketService, descriptor: Array<unknown>): Validators {
    const validationSeq = [];
    for (const validationSet of descriptor) {
      let prevalidator: PreValidator;
      const validators = [];
      for (const desc of Object.keys(validationSet)) {
        const mapping = descriptorMapping[desc] as DescriptorMapping;
        if (mapping === undefined) {
          throw new Error(`Unknown validator type ${desc}`);
        }
        const validator = ValidatorFactory.create(mapping.type, validationSet[desc], mapping.useService ? service : undefined);
        if (mapping.prevalidate) {
          if (prevalidator) {
            throw new Error('You must use only one prevalidator');
          }
          if (!(validator instanceof PreValidator)) {
            throw new Error('Illegal validator. Validator tagged as prevalidator must be a PreValidator instance.');
          }
          prevalidator = validator;
          logger.debug('prevalidator: %s (from %s)', validator.constructor.name, desc);
        } else {
          validators.push(validator);
          logger.debug('validator: %s (from %s)', validator.constructor.name, desc);
        }
      }
      validationSeq.push(new ValidatorSet(prevalidator, validators));
    }
    return new Validators(new ValidatorSequence(validationSeq));
  }
}
