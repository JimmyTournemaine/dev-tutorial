import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { NgxEditorModel } from './editor-utils';

@Injectable({
  providedIn: 'root',
})
export class EditorService {
  newModel: Observable<NgxEditorModel>;

  removedModel: Observable<NgxEditorModel>;

  save: Observable<NgxEditorModel>;

  close: Observable<boolean>;

  private newSubject: Subject<NgxEditorModel>;

  private removedSubject: Subject<NgxEditorModel>;

  private saveSubject: Subject<NgxEditorModel>;

  private closeSubject: Subject<boolean>;

  constructor() {
    this.newSubject = new ReplaySubject<NgxEditorModel>();
    this.removedSubject = new ReplaySubject<NgxEditorModel>();
    this.saveSubject = new ReplaySubject<NgxEditorModel>();
    this.closeSubject = new ReplaySubject<boolean>();

    this.newModel = this.newSubject.asObservable();
    this.removedModel = this.removedSubject.asObservable();
    this.save = this.saveSubject.asObservable();
    this.close = this.closeSubject.asObservable();
  }

  /**
   * Should add an editor based on the given model.
   *
   * @param model The model used to create the editor
   */
  addEditor(model: NgxEditorModel): void {
    this.newSubject.next(model);
  }

  /**
   * Save a model
   *
   * @param model The model which should be saved.
   */
  saveModel(model: NgxEditorModel): void {
    this.saveSubject.next(model);
  }

  /**
   * Add an editor based on the given model.
   *
   * @param last True if the editor closed was the last opened editor.
   */
  closeEditor(last: boolean): void {
    this.closeSubject.next(last);
  }
}
