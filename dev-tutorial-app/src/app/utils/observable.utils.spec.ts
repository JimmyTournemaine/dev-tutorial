import { defer, Observable, of, throwError } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { retryWhen } from './observable.utils';

const helper = (index: number): Observable<number> => {
  let current = 0;
  return defer(() => of(current++)).pipe(
    map(i => {
      if (i < index) {
        throw new Error(`${i}`);
      }
      return i;
    })
  );
};

describe('Utils: Observable', () => {
  it('should not retry', (done: DoneFn) => {
    let value: number = null;
    let err: Error = null;
    let count = 0;
    helper(0).pipe(
      take(5),
      retryWhen({ retries: 3, do: () => count++ }),
    ).subscribe({
      next: (res) => { value = res; },
      error: (e: Error) => { err = e; },
      complete: () => {
        expect(err).toBeNull();
        expect(value).toEqual(0); // first value used
        expect(count).toEqual(0); // no retry
        done();
      }
    });
  });
  it('should retry twice', (done: DoneFn) => {
    let value: number = null;
    let err: Error = null;
    let count = 0;
    helper(2).pipe(
      retryWhen({ retries: 2, do: () => count++ }),
    ).subscribe({
      next: (res) => { value = res; },
      error: (e: Error) => { err = e; },
      complete: () => {
        expect(err).toBeNull();
        expect(value).toEqual(2); // 3rd value
        expect(count).toEqual(2); // two retries
        done();
      }
    });
  });
  it('should throw', (done: DoneFn) => {
    let count = 0;
    defer(() => throwError('It\'s broken')).pipe(
      retryWhen({ retries: 2, do: () => { count++; } }),
    ).subscribe({
      error: (e: Error) => {
        expect(e).not.toBeNull(); // got error
        expect(count).toEqual(3); // 3 retries
        done();
      }
    });
  });
});
