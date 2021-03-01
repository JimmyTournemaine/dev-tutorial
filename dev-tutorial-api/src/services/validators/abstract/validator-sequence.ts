import { ValidatorSet } from './validator-set';

export class ValidatorSequence {
  validators: ValidatorSet[];

  private currentIndex = 0;

  constructor(validators: ValidatorSet[]) {
    this.validators = validators;
  }

  get(): ValidatorSet {
    return this.validators[this.currentIndex];
  }

  next(): ValidatorSet {
    return this.validators[++this.currentIndex];
  }

  hasNext(): boolean {
    return this.currentIndex + 1 < this.validators.length;
  }
}
