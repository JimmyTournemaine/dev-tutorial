// eslint-disable-next-line import/no-unresolved
import * as monacoEditor from 'monaco-editor';
import { NgxEditorModel } from './editor-utils';

export class EditorTab {
  private editorModel: NgxEditorModel;

  private tabLabel: string;

  private changed: boolean;

  private editor: monacoEditor.editor.ICodeEditor;

  constructor(model: NgxEditorModel) {
    this.editorModel = model;
    this.changed = false;
    this.tabLabel = model.uri.split('/').pop();
  }

  public get model(): NgxEditorModel {
    return this.editorModel;
  }

  public get label(): string {
    return this.tabLabel;
  }

  public isChanged(): boolean {
    return this.changed;
  }

  public setChanged(v: boolean): void {
    this.changed = v;
  }

  public getEditor(): monacoEditor.editor.ICodeEditor {
    return this.editor;
  }

  public setEditor(ref: monacoEditor.editor.ICodeEditor): void {
    this.editor = ref;
  }
}
