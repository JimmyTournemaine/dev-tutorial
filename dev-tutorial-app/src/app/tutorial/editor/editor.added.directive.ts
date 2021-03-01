import { Directive, Output, EventEmitter, ElementRef, OnInit } from '@angular/core';

@Directive({
  selector: '[appEditorAdded]'
})
export class EditorAddedDirective implements OnInit {
  @Output() appEditorAdded = new EventEmitter<ElementRef<HTMLElement>>();

  constructor(private el: ElementRef<HTMLElement>) {
  }

  ngOnInit(): void {
    this.appEditorAdded.emit(this.el);
  }
}
