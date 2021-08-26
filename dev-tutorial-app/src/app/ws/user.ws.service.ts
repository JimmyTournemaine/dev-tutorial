import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AbstractWebServices } from './abtract.ws.service';
import { Token } from './model/token';

@Injectable({
  providedIn: 'root'
})
export class UserWebServices extends AbstractWebServices {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Alias for login (no real signin feature for now)
   *
   * @param username The username
   * @returns An observable of the response token
   * @alias login
   */
  signin(username: string): Observable<Token> {
    return this.login(username);
  }

  /**
   * @param username The username
   * @returns An observable of the response token
   */
  login(username: string): Observable<Token> {
    return this.post<Token>('/user', { username });
  }

  /**
   * Refresh a user token
   *
   * @param userId The user identifier
   * @param username The username
   * @returns An observable of the response containing the access token.
   */
  refresh(userId: string, username: string): Observable<HttpResponse<Token>> {
    return this.putResponse<Token>('/user/refresh', { userId, username });
  }
}
