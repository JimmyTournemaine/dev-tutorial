import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthGuardService } from './auth-guard.service';

import { AuthService } from './auth.service';

describe('Guard: Authentication', () => {
  let service: AuthGuardService;

  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated', 'login']);

    // DI
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        AuthGuardService,
      ],
    });
    service = TestBed.inject(AuthGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should activate when the user is authenticated', (done: DoneFn) => {
    auth.isAuthenticated.and.returnValue(true);

    const canActivate = service.canActivate();

    canActivate.subscribe((can: boolean) => {
      expect(can).toBeTrue();
      expect(auth.login).not.toHaveBeenCalled();
      done();
    });
  });

  it('should activate when the user is not authenticated by login him', (done: DoneFn) => {
    auth.isAuthenticated.and.returnValue(false);
    auth.login.and.returnValue(of(true));

    const canActivate = service.canActivate();

    canActivate.subscribe((can: boolean) => {
      expect(can).toBeTrue();
      expect(auth.login).toHaveBeenCalled();
      done();
    });
  });

  it('should not activate when login fails', (done: DoneFn) => {
    auth.isAuthenticated.and.returnValue(false);
    auth.login.and.returnValue(of(false));

    const canActivate = service.canActivate();

    canActivate.subscribe((can: boolean) => {
      expect(can).toBeFalse();
      expect(auth.login).toHaveBeenCalled();
      done();
    });
  });
});
