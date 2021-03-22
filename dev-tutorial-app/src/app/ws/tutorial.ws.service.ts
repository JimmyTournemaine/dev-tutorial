import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { map, retryWhen, delayWhen } from 'rxjs/operators';
import { Tutorial } from '../tutorial/tutorial';
import { AbstractWebServices } from './abtract.ws.service';

@Injectable({
  providedIn: 'root'
})
export class TutorialsWebServices extends AbstractWebServices {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Find all tutorials.
   *
   * @returns An observable of all the tutorials.
   */
  findAll(): Observable<Tutorial[]> {
    return this.get<Tutorial[]>('/tuto');
  }

  /**
   * Search for tutorials.
   *
   * @param search search The search object.
   * @param search.search The text to search.
   * @returns An observable of matching tutorials.
   */
  search(search: { search: string }): Observable<Tutorial[]> {
    return this.post<Tutorial[]>('/tuto/search', search);
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
    return this.postResponse<void>(`/tuto/${tutoId}/start`, {});
  }

  /**
   * Get the status of the "start" async processing.
   *
   * @param location The status endpoint location.
   * @returns An obserable of the response.
   */
  status(location: string): Observable<HttpResponse<void>> {
    return this.getResponse<void>(location);
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
            .pipe(
              map((response: HttpResponse<void>) => {
                if (response.status === 200) { throw new Error(response.toString()); }
                console.log('will retry');
                return response;
              }),
              retryWhen(errors => {
                let retries = 5;
                return errors.pipe(
                  delayWhen(() => timer(3000)),
                  map((err: Error) => {
                    if (retries-- === 0) {
                      throw err;
                    }
                    return err;
                  }),
                );
              })
            )
            .subscribe(observer);
        },
        (err: Error) => observer.error(err));
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
    return this.post<void>(`/tuto/${tutoId}/write?path=${path}`, content, { headers });
  }
}
