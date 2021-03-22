import { Directive, Output, EventEmitter, ElementRef, OnInit } from '@angular/core';

/**
 * This directive emit an event when a referenced html editor is loaded.
 *
 * Any composent using Monaco editor should use this directive
 * and wait for this event before creating any editor model.
 */
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
