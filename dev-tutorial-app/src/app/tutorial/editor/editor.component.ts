import { EventEmitter, Input, OnChanges, Output, SimpleChanges, Component } from '@angular/core'

import { NgxEditorModel } from 'ngx-monaco-editor'

type Editor = monaco.editor.IStandaloneCodeEditor; // | monaco.editor.IStandaloneDiffEditor

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnChanges {
  private static readonly LANG_MAP = {
    js: 'javascript',
    java: 'java',
    ts: 'typescript',
    css: 'css',
    html: 'html',
    sh: 'bash',
    xml: 'xml',
    yml: 'yml'
  };

  private static readonly LANG_FALLBACK = 'plaintext';

  content = '';
  options = {};

  @Input()
  model: NgxEditorModel;

  @Output()
  save = new EventEmitter<string>();

  @Output()
  quit = new EventEmitter<void>();

  ngOnChanges (changes: SimpleChanges): void {
    if (changes.model) {
      this.content = changes.model.currentValue.value

      let lang = changes.model.currentValue.language
      if (!lang) {
        lang = EditorComponent.LANG_FALLBACK
        if (changes.model.currentValue.uri) {
          const ext = changes.model.currentValue.uri.split('.').pop()
          const found = EditorComponent.LANG_MAP[ext]
          if (found) {
            lang = found
          }
        }
      }
      this.options = Object.assign({}, this.options, { language: lang })
    }
  }

  onEditorInit (editor: Editor): void {
    editor.focus()
    editor.addAction({
      id: 'quit',
      label: 'Quit without saving',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Q
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.6,

      run: () => {
        this.quit.emit()
      }
    })
    editor.addAction({
      id: 'save-and-quit',
      label: 'Save and quit',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,

      run: () => {
        this.save.emit(editor.getValue())
        this.quit.emit()
      }
    })
  }
}
