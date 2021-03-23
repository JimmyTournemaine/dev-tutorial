import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EditorAddedDirective } from './editor.added.directive';

describe('Directives: EditorAddedDirective', () => {
  let service: EditorAddedDirective;
  let elementRef: ElementRef;

  beforeEach(async () => {
    elementRef = { nativeElement: {} };

    await TestBed.configureTestingModule({
      providers: [
        EditorAddedDirective,
        { provide: ElementRef, useValue: elementRef }
      ],
    }).compileComponents();

    service = TestBed.inject(EditorAddedDirective);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should emit on init', (done) => {
    service.appEditorAdded.asObservable().subscribe((elemRef) => {
      expect(elemRef).toEqual(elementRef);
      done();
    });
    service.ngOnInit();
  });
});
