import { Done } from 'mocha';

/**
 * Allow to handle multiple "done" callbacks.
 */
class PartialDone {
  private value = 0;

  constructor(private expected: number, private _done: Done) { }

  done(err?: any): void {
    if (err) {
      return this._done(new Error(`error at ${this.value}/${this.expected}, reason: ${err}`));
    }
    if (++this.value == this.expected) {
      this._done();
    }
  };
}

export const partial = (expected: number, done: Done): PartialDone => {
  return new PartialDone(expected, done);
};
