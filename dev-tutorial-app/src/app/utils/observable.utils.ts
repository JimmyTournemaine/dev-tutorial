import { MonoTypeOperatorFunction, Observable, timer } from 'rxjs';
import { retryWhen as retry, delayWhen, map } from 'rxjs/operators';

type RetryOperator = <T>(strategy: RetryStrategy) => MonoTypeOperatorFunction<T>;

interface RetryStrategy {
  retries: number;
  delay?: number;
  do?: (error: Error) => void;
}

export const retryWhen: RetryOperator = <T>(strategy: RetryStrategy) => retry<T>((errorObservable: Observable<Error>) => {
  let r = strategy.retries + 1;
  return errorObservable.pipe(
    delayWhen(() => timer(strategy.delay || 0)),
    map((err: Error) => {
      console.log('r', r);
      if (r-- === 0) {
        throw err;
      }
      if (strategy.do) {
        strategy.do(err);
      }
      return err;
    })
  );
});
