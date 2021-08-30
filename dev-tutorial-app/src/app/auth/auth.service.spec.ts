import { HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { JwtHelperService } from '@auth0/angular-jwt';
import { defer, of } from 'rxjs';
import { UserWebServices } from '../ws/user.ws.service';

import { AuthService } from './auth.service';

describe('Auth: AuthService', () => {
  let service: AuthService;

  let ws: jasmine.SpyObj<UserWebServices>;
  let storage: Record<string, string>;
  let jwtHelper: jasmine.SpyObj<JwtHelperService>;

  beforeEach(() => {
    // Spy REST calls
    ws = jasmine.createSpyObj<UserWebServices>('UserWebServices', ['login', 'refresh']);
    ws.login.and.returnValue(of({ userId: 'test-id', token: 'test-jwt-access-token' }));
    ws.refresh.and.returnValue(defer(() => {
      const token = { userId: 'test-id', token: 'test-jwt-access-token-refreshed' };
      const response = new HttpResponse({ body: token });
      return of(response);
    }));

    // Spy JWT validation
    jwtHelper = jasmine.createSpyObj<JwtHelperService>('JwtHelperService', ['isTokenExpired']);
    jwtHelper.isTokenExpired.and.callFake(() => false);

    // Spy Local Storage
    storage = {};
    spyOn(localStorage, 'getItem').and.callFake((key) => storage[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key, value) => { storage[key] = value; });
    spyOn(localStorage, 'clear').and.callFake(() => { storage = {}; });

    // DI
    TestBed.configureTestingModule({
      providers: [
        { provide: UserWebServices, useValue: ws },
        { provide: JwtHelperService, useValue: jwtHelper }
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should the token be empty', () => {
    expect(service.getToken()).toBeFalsy();
  });

  it('should not be authenticate', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should authenticate a user', (done: DoneFn) => {
    service.login().subscribe((boo) => {
      expect(boo).toBeTrue();
      expect(service.isAuthenticated()).toBeTrue();
      done();
    });
  });
});
