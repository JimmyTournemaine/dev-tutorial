import { Validator } from './validator-abstract';

interface PreValidatorOptions {
  cmd: string;
}
/**
 * Prevalidator: others validators will listen only after the command prevalidation.
 */

export class PreValidator extends Validator<PreValidatorOptions, string, boolean> {
  validate(cmd: string): boolean {
    if (cmd === undefined || cmd.trim().length === 0) {
      return false;
    }

    // TODO do something
    // console.log(CommandParser.parse(cmd));
    // Start with validation
    if (cmd.startsWith(this.options.cmd)) {
      return true;
    }

    // Trim, etc. to validate the command with eventually some typos
    const expected = this.options.cmd.split(' ').filter((v) => v);
    const given = cmd.split(' ').filter((v) => v);

    return expected.every((value: string, index: number) => value === given[index]);
  }
}
