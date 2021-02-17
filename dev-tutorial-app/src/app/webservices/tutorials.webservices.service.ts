/* eslint-disable @typescript-eslint/ban-types */
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { map, retryWhen, delayWhen } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Tutorial } from '../tutorial/tutorial';

@Injectable({
  providedIn: 'root'
})
export class TutorialsWebServices {
  constructor(private http: HttpClient) {
  }

  /**
   * Find all tutorials.
   *
   * @returns An observable of all the tutorials.
   */
  findAll(): Observable<Tutorial[]> {
    return this.http.get<Tutorial[]>(this.endpoint('/tuto'));
  }

  /**
   * Search for tutorials.
   *
   * @param search search The search object.
   * @param search.search The text to search.
   * @returns An observable of matching tutorials.
   */
  search(search: { search: string }): Observable<Tutorial[]> {
    return this.http.post<Tutorial[]>(this.endpoint('/tuto/search'), search);
  }

  /**
   * Get a slide content.
   *
   * @param tutoId The tutorial identifier.
   * @param slideId The slide identifier.
   * @returns An observable of the slide content text.
   */
  getSlide(tutoId: string, slideId: number): Observable<string> {
    return this.http.get(this.endpoint(`/tuto/${tutoId}/slides/${slideId + 1}`), { responseType: 'text' });
  }

  /**
   * Start a tutorial
   *
   * @param tutoId The tutoriel idenfifier
   * @returns An observable of the response
   */
  start(tutoId: string): Observable<HttpResponse<void>> {
    return this.http.post<void>(this.endpoint(`/tuto/${tutoId}/start`), {}, { observe: 'response' });
  }

  /**
   * Get the status of the "start" async processing.
   *
   * @param location The status endpoint location.
   * @returns An obserable of the response.
   */
  status(location: string): Observable<HttpResponse<void>> {
    return this.http.get<void>(location, { observe: 'response' });
  }

  /**
   * Start a tutorial container but don't send value until the container is ready.
   *
   * @param tutoId The tutorial identifier.
   * @returns An observable of the 'Created' response when the container is ready.
   */
  getReady(tutoId: string): Observable<HttpResponse<void>> {
    return new Observable((observer) => {
      this.start(tutoId)
        .subscribe((res: HttpResponse<void>) => {
          const location = res.headers.get('Location');
          this.status(location)
            .pipe(map((response: HttpResponse<void>) => {
              if (response.status === 200) { throw new Error(response.toString()); }
              return response;
            }))
            .pipe(retryWhen(errors => errors.pipe(
              delayWhen(() => timer(1000))
            )))
            .subscribe((statusRes: HttpResponse<void>) => {
              observer.next(statusRes);
              observer.complete();
            });
        });
    });
  }

  /**
   * Edit a file
   *
   * @param tutoId The tutoriel idenfifier
   * @param path The path to the file to write
   * @param content The file content to write
   * @returns An observable of the response.
   */
  edit(tutoId: string, path: string, content: string): Observable<void> {
    const headers = new HttpHeaders({
      /* eslint-disable-next-line @typescript-eslint/naming-convention */
      'Content-Type': 'application/octet-stream'
    });
    return this.http.post<void>(this.endpoint(`/tuto/${tutoId}/write?path=${path}`), content, { headers });
  }

  private endpoint(path: string): string {
    return environment.apiEndpoint + path;
  }
}
