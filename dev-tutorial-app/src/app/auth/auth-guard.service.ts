import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuardService implements CanActivate {
  constructor(private auth: AuthService) {}

  canActivate(): Observable<boolean> {
    if (!this.auth.isAuthenticated()) {
      return this.auth.login();
    }
    return of(true);
  }
}
