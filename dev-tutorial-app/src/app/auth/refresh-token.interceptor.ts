/* no-unsafe rules desactivated to implements HttpInterceptor member */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { catchError, map, retryWhen, share, switchMap, tap } from 'rxjs/operators';
import { defer, of } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class RefreshTokenInterceptor implements HttpInterceptor {
  private retryRequest = Symbol('retryRequest');

  private refreshToken = this.auth.refresh()
    .pipe(
      tap(newToken => {
        console.log('newToken', newToken);
        if (newToken) {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw this.retryRequest;
        }
      }),
      share(),
    );

  constructor(private auth: AuthService) {
  }

  /**
   * Add the user token to the Authorization header of any request
   * and try to refresh the access token in case of 401 response.
   *
   * @param request The intercepted request
   * @param next The request handler
   * @returns An observable over the modified request call.
   */
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return defer(() => of(this.auth.getToken())).pipe(
      // Inject authentication header
      map((token: string) => {
        if (token != null) {
          return request.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
        }
        return request;
      }),
      // Send the request
      switchMap((req) => next.handle(req)),
      // On 401, try refreshing the token
      catchError(err => {
        console.log('gotcha', err);
        if (err instanceof HttpErrorResponse && err.status === 401) {
          console.log('lets retry');
          return this.refreshToken;
        }
        console.log('abort with error');
        throw err;
      }),
      retryWhen((obs) => {
        let retries = 1;
        return obs.pipe(
          tap(err => {
            if (err !== this.retryRequest || retries <= 0) {
              throw err;
            }
            retries--;
          })
        );
      })
    );
  }
}
