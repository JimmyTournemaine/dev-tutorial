import { PreValidator } from './abstract/validator-pre';
import { ValidatorConstructor } from './abstract/validator-constructor';
import { ExitCodeValidator } from './exit-code/exit-code-validator';
import { CreatesValidator } from './docker/creates-validator';
import { Validator } from './abstract/validator-abstract';

/**
 * Map classes for Factory
 */
export interface DescriptorMapping {
  type: ValidatorConstructor<unknown, Validator<unknown, unknown, unknown>>;
  useService: boolean;
  prevalidate: boolean;
}

/**
 * List descriptor keys which can be used in tutorial.json
 */
type DescriptorKey = 'prevalidate' | 'input' | 'rc' | 'exitCode' | 'creates';

/**
 * Map keys with class and some extra informations
 */
export const descriptorMapping: Record<DescriptorKey, DescriptorMapping> = {
  prevalidate: { type: PreValidator, useService: false, prevalidate: true },
  input: { type: PreValidator, useService: false, prevalidate: true },
  rc: { type: ExitCodeValidator, useService: false, prevalidate: false },
  exitCode: { type: ExitCodeValidator, useService: false, prevalidate: false },
  creates: { type: CreatesValidator, useService: true, prevalidate: false },
};
