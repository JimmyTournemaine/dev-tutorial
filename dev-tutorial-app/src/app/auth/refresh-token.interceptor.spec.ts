import { HttpErrorResponse, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { defer, Observable, of, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Token } from '../ws/model/token';

import { AuthService } from './auth.service';
import { RefreshTokenInterceptor } from './refresh-token.interceptor';

describe('Interceptor: Refresh Token', () => {
  let service: RefreshTokenInterceptor;

  let auth: jasmine.SpyObj<AuthService>;
  let next: jasmine.SpyObj<HttpHandler>;
  let refreshCount: number;

  let refreshFunc: () => Observable<HttpResponse<Token>>;

  beforeEach(() => {
    // Spies
    next = jasmine.createSpyObj<HttpHandler>('HttpHandler', ['handle']);
    refreshCount = 0;
    refreshFunc = () => of(new HttpResponse({ body: { userId: 'user', token: 'refreshed' } }));
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getToken', 'refresh']);
    auth.refresh.and.callFake(() => defer(() => refreshFunc())
      .pipe(tap(() => refreshCount++, () => refreshCount++)));

    // DI
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        RefreshTokenInterceptor,
      ],
    });
    service = TestBed.inject(RefreshTokenInterceptor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add the access token in the header', (done: DoneFn) => {
    auth.getToken.and.returnValue('test-token');
    next.handle.and.returnValue(of(new HttpResponse({ status: 200 })));

    const req = new HttpRequest('GET', '/api/fake/call');

    service.intercept(req, next).subscribe(() => {
      expect(next.handle).toHaveBeenCalled();
      expect(next.handle.calls.mostRecent().args[0].headers.get('Authorization')).toEqual('Bearer test-token');
      done();
    });
  });

  it('should not add the access token in the header when not authenticated', (done: DoneFn) => {
    // SPY
    auth.getToken.and.returnValue(null);
    next.handle.and.returnValue(of(new HttpResponse({ status: 200 })));

    // GIVEN
    const req = new HttpRequest('GET', '/api/fake/call');

    // WHEN
    const intercept = service.intercept(req, next);

    // THEN
    intercept.subscribe(() => {
      expect(next.handle).toHaveBeenCalled();
      expect(next.handle.calls.mostRecent().args[0].headers.get('Authorization')).toBeNull();
      done();
    });
  });

  it('should not retry on successfull response', (done: DoneFn) => {
    // SPY
    auth.getToken.and.returnValue(null);
    next.handle.and.returnValue(of(200, 201, 209, 301).pipe(map((status) => new HttpResponse({ status }))));

    // GIVEN
    const req = new HttpRequest('GET', '/api/fake/call');

    // WHEN
    const intercept = service.intercept(req, next);

    // THEN
    intercept.subscribe({
      next: () => expect(refreshCount).toEqual(0),
      error: fail,
      complete: done
    });
  });

  it('should refresh the token and retry on 401 response', (done: DoneFn) => {
    // SPY
    auth.getToken.and.returnValue(null);

    let firstResponse = true;
    next.handle.and.returnValue(defer(() => { // 401, then 200
      if (firstResponse) {
        firstResponse = false;
        return throwError(new HttpErrorResponse({ status: 401 }));
      }
      return of(new HttpResponse({ status: 200 }));
    }));

    // GIVEN
    const req = new HttpRequest('GET', '/api/fake/call');

    // WHEN
    const intercept = service.intercept(req, next);

    // THEN
    intercept.subscribe(() => {
      expect(refreshCount).toEqual(1);
      expect(next.handle).toHaveBeenCalledTimes(2);
      done();
    });
  });

  it('should not retry if response is not a 401', (done: DoneFn) => {
    // SPY
    auth.getToken.and.returnValue(null);
    next.handle.and.returnValue(throwError(new HttpErrorResponse({ status: 500 })));

    // GIVEN
    const req = new HttpRequest('GET', '/api/fake/call');

    // WHEN
    const intercept = service.intercept(req, next);

    // THEN
    intercept.subscribe({
      error: () => {
        expect(refreshCount).toEqual(0);
        expect(next.handle).toHaveBeenCalledTimes(1);
        done();
      }
    });
  });

  it('should not retry if 401 come from refresh response', (done: DoneFn) => {
    // SPY
    refreshFunc = () => throwError(new HttpErrorResponse({ status: 401 }));
    auth.getToken.and.returnValue(null);
    next.handle.and.returnValue(throwError(new HttpErrorResponse({ status: 401 })));

    // GIVEN
    const req = new HttpRequest('GET', '/api/fake/call');

    // WHEN
    const intercept = service.intercept(req, next);

    // THEN
    intercept.subscribe({
      error: () => {
        expect(refreshCount).toEqual(1);
        expect(next.handle).toHaveBeenCalledTimes(1);
        done();
      },
      complete: () => fail('Unexpected completion')
    });
  });
});
