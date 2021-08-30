import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { defer, forkJoin, Observable, of } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { Token } from '../ws/model/token';
import { UserWebServices } from '../ws/user.ws.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private ws: UserWebServices, private jwtHelper: JwtHelperService) {}

  /**
   * Log a user in
   *
   * No parameter is required because login generate a random username for now.
   *
   * @returns An observable that emit true on login success and false on error.
   *
   */
  login(): Observable<boolean> {
    // eslint-disable-next-line no-bitwise
    const s4 = (): string => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    const username = `${s4()}-${s4()}-${s4()}-${s4()}`;

    return this.ws.login(username).pipe(
      map((res: Token) => {
        localStorage.setItem('token:userId', res.userId);
        localStorage.setItem('token:value', res.token);
        localStorage.setItem('token:username', username);
        return true;
      }),
      catchError((err: Error) => {
        console.error('Unable to login', err);
        return of(false);
      })
    );
  }

  refresh(): Observable<HttpResponse<Token>> {
    return forkJoin({
      userId: defer(() => of(localStorage.getItem('token:userId'))),
      username: defer(() => of(localStorage.getItem('token:username')))
    }).pipe(
      switchMap(value => this.ws.refresh(value.userId, value.username).pipe(tap(resp => {
        localStorage.setItem('token:userId', resp.body.userId);
        localStorage.setItem('token:value', resp.body.token);
      })))
    );
  }

  getToken(): string {
    return localStorage.getItem('token:value');
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null && !this.jwtHelper.isTokenExpired(this.getToken());
  }
}
