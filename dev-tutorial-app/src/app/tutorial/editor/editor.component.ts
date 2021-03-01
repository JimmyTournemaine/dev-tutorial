import { Component, AfterViewInit, ElementRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
// eslint-disable-next-line import/no-unresolved
import * as monacoEditor from 'monaco-editor';
import { NgxEditorModel } from './editor-utils';
import { EditorService } from './editor.service';
import { EditorTab } from './editor.tab.model';
import { QuitWithoutSavingDialogComponent, QuitWithoutSavingDialogCloseState } from './editor.quit-dialog.component';

declare const monaco: typeof monacoEditor;

type AsyncRequire = { require: (deps: string[], cb: () => void) => void };

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css'],
})
export class EditorComponent implements AfterViewInit {
  editorTabs = new Array<EditorTab>();

  selectedEditor = 0;

  options: monacoEditor.editor.IStandaloneEditorConstructionOptions = {
    theme: 'vs-dark',
    automaticLayout: true,
  };

  constructor(private editorService: EditorService, public dialog: MatDialog) {
  }

  ngAfterViewInit(): void {
    const initialized = new Promise<void>((resolve) => {
      // Load AMD loader if necessary
      if (!window.require) {
        console.log('loading AMD script');
        const loaderScript = document.createElement('script');
        loaderScript.type = 'text/javascript';
        loaderScript.src = 'vs/loader.js';
        loaderScript.addEventListener('load', () => this.onGotAmdLoader(resolve));
        document.body.appendChild(loaderScript);
      } else {
        this.onGotAmdLoader(resolve);
      }
    });
    this.editorService.newModel.subscribe((model: NgxEditorModel) => {
      void initialized.then(() => {
        this.editorTabs.push(new EditorTab(model));
        this.selectedEditor = this.editorTabs.length - 1;
      });
    });
  }

  createEditor(tab: EditorTab, el: ElementRef<HTMLElement>): void {
    const editor = monaco.editor.create(el.nativeElement, {
      ...this.options,
      value: tab.model.value,
      language: tab.model.language,
    });

    tab.setEditor(editor);
    editor.focus();

    editor.onDidChangeModelContent(() => {
      tab.setChanged(editor.getValue() !== tab.model.value);
    });

    editor.addAction({
      id: 'save',
      label: 'Save',
      keybindings: [
        /* eslint-disable-next-line no-bitwise */
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,

      run: () => {
        this.save(tab);
      }
    });
    editor.addAction({
      id: 'close',
      label: 'Close',
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.6,

      run: () => {
        this.close(this.editorTabs.findIndex((value) => value.model === tab.model));
      }
    });
  }

  /**
   * Focus on the editor on tab changed.
   *
   * @param tabChangeEvent The tab changed event
   */
  tabChanged(tabChangeEvent: MatTabChangeEvent): void {
    if (tabChangeEvent.index > 0) {
      this.editorTabs[tabChangeEvent.index].getEditor().focus();
    }
  }

  /**
   * Close the editor at the given tab index.
   *
   * @param tabIndex The index of the tab to close.
   */
  close(tabIndex: number): void {
    const tab = this.editorTabs[tabIndex];
    if (tab.isChanged()) {
      const dialogRef = this.dialog.open(QuitWithoutSavingDialogComponent, { data: { label: tab.label } });
      dialogRef.afterClosed().subscribe((state: QuitWithoutSavingDialogCloseState) => {
        switch (state) {
          case QuitWithoutSavingDialogCloseState.SAVE:
            this.save(tab);
            // falls through
          case QuitWithoutSavingDialogCloseState.DONTSAVE:
            this.editorTabs.splice(tabIndex, 1);
            this.editorService.closeEditor(this.editorTabs.length < 1);
          // no default
        }
      });
    } else {
      this.editorTabs.splice(tabIndex, 1);
      this.editorService.closeEditor(this.editorTabs.length < 1);
    }
  }

  private save(tab: EditorTab) {
    tab.setChanged(false);
    this.editorService.saveModel({ ...tab.model, value: tab.getEditor().getValue() });
  }

  /**
   * Load monaco
   *
   * @param cb A callback
   */
  private onGotAmdLoader = (cb?: () => void): void => {
    (window as unknown as AsyncRequire).require(['vs/editor/editor.main'], () => {
      console.log('AMD loaded, executing callback');
      cb();
    });
  };
}
