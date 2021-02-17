import { EventEmitter, Input, OnChanges, Output, SimpleChanges, Component } from '@angular/core';

import { NgxEditorModel } from 'ngx-monaco-editor';

type Editor = monaco.editor.IStandaloneCodeEditor; // | monaco.editor.IStandaloneDiffEditor

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnChanges {
  private static readonly langMap: Record<string, string> = {
    js: 'javascript',
    java: 'java',
    ts: 'typescript',
    css: 'css',
    html: 'html',
    sh: 'bash',
    xml: 'xml',
    yml: 'yml'
  };

  private static readonly langFormat = 'plaintext';

  @Input()
  model: NgxEditorModel;

  @Output()
  save = new EventEmitter<string>();

  @Output()
  quit = new EventEmitter<void>();

  content = '';

  options = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.model) {
      const currentValue = changes.model.currentValue as NgxEditorModel;
      let lang = currentValue.language;
      const uri = currentValue.uri as string;
      if (!lang) {
        lang = EditorComponent.langFormat;
        if (currentValue.uri) {
          const ext = uri.split('.').pop();
          const found = EditorComponent.langMap[ext];
          if (found) {
            lang = found;
          }
        }
      }
      this.options = { ...this.options, language: lang };
    }
  }

  onEditorInit(editor: Editor): void {
    editor.focus();
    editor.addAction({
      id: 'quit',
      label: 'Quit without saving',
      keybindings: [
        /* eslint-disable-next-line no-bitwise */
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Q
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.6,

      run: () => {
        this.quit.emit();
      }
    });
    editor.addAction({
      id: 'save-and-quit',
      label: 'Save and quit',
      keybindings: [
        /* eslint-disable-next-line no-bitwise */
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,

      run: () => {
        this.save.emit(editor.getValue());
        this.quit.emit();
      }
    });
  }
}
