import { HttpClient, HttpEvent, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

type RequestOptions = {
  headers: HttpHeaders | {
    [header: string]: string | string[];
  };
};

export class AbstractWebServices {
  constructor(protected http: HttpClient) {
  }

  get<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(this.endpoint(path), options);
  }

  getResponse<T>(path: string, options?: RequestOptions): Observable<HttpResponse<T>> {
    return this.http.get<T>(this.endpoint(path), {
      ...options,
      observe: 'response'
    });
  }

  post<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(this.endpoint(path), body, options);
  }

  postResponse<T>(path: string, body: unknown, options?: RequestOptions): Observable<HttpResponse<T>> {
    return this.http.post<T>(this.endpoint(path), body, {
      ...options,
      observe: 'response',
    });
  }

  put<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.put<T>(this.endpoint(path), body, options);
  }

  putResponse<T>(path: string, body: unknown, options?: RequestOptions): Observable<HttpResponse<T>> {
    return this.http.put<T>(this.endpoint(path), body, {
      ...options,
      observe: 'response',
    });
  }

  putEvent<T>(path: string, body: unknown, options?: RequestOptions): Observable<HttpEvent<T>> {
    return this.http.put<T>(this.endpoint(path), body, {
      ...options,
      observe: 'events',
    });
  }

  protected endpoint(path: string): string {
    if (path.indexOf(environment.apiEndpoint) >= 0) {
      return path;
    }
    return environment.apiEndpoint + path;
  }
}
