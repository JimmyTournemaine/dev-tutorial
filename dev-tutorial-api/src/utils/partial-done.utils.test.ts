import { Done } from 'mocha';
import { LoggerFactory } from '../services/logger/logger';

const logger = LoggerFactory.getLogger('test:partial-done');

/**
 * Allow to handle multiple "done" callbacks to create steps.
 */
class PartialDone {
  private value = 0;

  constructor(private expected: number, private mochaDone: Done) { }

  done(err?: Error | string): void {
    if (err) {
      const reason = err instanceof Error ? err.message : err;
      this.mochaDone(new Error(`error at ${this.value}/${this.expected}, reason: ${reason}`));
      return;
    }
    logger.debug('%d of %d done', this.value + 1, this.expected);
    if (++this.value === this.expected) {
      this.mochaDone();
    }
  }
}
export const partial = (expected: number, done: Done): PartialDone => new PartialDone(expected, done);
