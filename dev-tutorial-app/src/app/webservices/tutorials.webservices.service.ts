import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { map, retryWhen, delayWhen } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Tutorial } from '../tutorial/tutorial';

@Injectable({
  providedIn: 'root'
})
export class TutorialsWebServices {


  constructor(private http: HttpClient) {

  }

  private endpoint(path: string, prefix = true): string {
    return environment.apiEndpoint + path;
  }

  /**
   * Find all tutorials.
   */
  findAll(): Observable<Tutorial[]> {
    return this.http.get<Tutorial[]>(this.endpoint('/tuto'));
  }

  /**
   * Search for tutorials
   * @param search search
   */
  search(search: { search: string; }): Observable<Tutorial[]> {
    return this.http.post<Tutorial[]>(this.endpoint('/tuto/search'), search);
  }

  /**
   * Get a slide content
   * 
   * @param tutoId The tutorial identifier
   * @param slideId The slide identifier
   */
  getSlide(tutoId: string, slideId: number): Observable<string> {
    return this.http.get(this.endpoint(`/tuto/${tutoId}/slides/${slideId + 1}`), { responseType: 'text' });
  }

  /**
   * Start a tutorial 
   * 
   * @param tutoId The tutoriel idenfifier
   * 
   */
  start(tutoId: string): Observable<any> {
    return this.http.post(this.endpoint(`/tuto/${tutoId}/start`), {}, { observe: 'response' });
  }

  /**
   * Get the status of the "start" async processing.
   * 
   * @param location The status endpoint location.
   * @return {Observable} An boolean observable that will be true if container is created and started.
   */
  status(location: string): Observable<HttpResponse<Object>> {
    return this.http.get(environment.apiHost + location, { observe: 'response' });
  }

  /**
   * Start a tutorial container but don't send value until the container is ready.
   * 
   * @param tutoId The tutorial identifier.
   */
  getReady(tutoId: string): Observable<HttpResponse<Object>> {
    return new Observable((observer) => {
      this.start(tutoId)
        .subscribe((res: HttpResponse<Object>) => {
          const location = res.headers.get('Location');
          this.status(location)
            .pipe(map((response: HttpResponse<Object>) => {
              if (response.status === 200) { throw response; }
              return response;
            }))
            .pipe(retryWhen(errors => {
              return errors.pipe(
                delayWhen(() => timer(1000))
              );
            }))
            .subscribe((res: HttpResponse<Object>) => {
              observer.next(res);
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
   * 
   */
  edit(tutoId: string, path: string, content: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/octet-stream',
    });
    return this.http.post(this.endpoint(`/tuto/${tutoId}/write?path=${path}`), content, { headers });
  }
}
