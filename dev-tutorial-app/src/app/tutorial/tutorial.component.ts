import { Component, OnInit, AfterViewInit, ViewChild, OnDestroy, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { TerminalComponent } from './terminal/terminal.component';
import { EditorComponent } from './editor/editor.component';
import { NgxEditorModel } from 'ngx-monaco-editor';
import { SlideshowComponent } from './slideshow/slideshow.component';
import { TutorialsWebServices } from '../webservices/tutorials.webservices.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import * as io from 'socket.io-client';

@Component({
  selector: 'app-tutorial',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.css']
})
export class TutorialComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('slideshow') private slideshowElement: ElementRef;
  @ViewChild('slide') slideshow: SlideshowComponent;

  @ViewChild('term', { static: false }) set terminalView(terminal: TerminalComponent) {
    if (terminal) {
      this.attachTerminal(terminal);
      this.terminal = terminal;
    }
  }

  @ViewChild('editor', { static: false }) set EditorView(editor: EditorComponent) {
    if (editor) {
      this.editor = editor;
    }
  }

  tutoId: string;
  socket: SocketIOClient.Socket;

  terminal: TerminalComponent;
  ready = false;
  disabled = false;

  editor: EditorComponent;
  editMode = false;
  model: NgxEditorModel;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ws: TutorialsWebServices,
    private dialog: MatDialog
  ) { }

  /**
   * Connect to the backend socket and get tutorial slides
   */
  ngOnInit(): void {
    this.socket = io(environment.socketEndpoint, { reconnection: false });

    this.route.paramMap.subscribe((params) => {
      this.tutoId = params.params.slug;
      if (environment.disableTerminal) {
        this.disabled = true;
      } else {
        this.ws.getReady(this.tutoId).subscribe(() => this.ready = true);
      }
    });

    // Next slide
    this.socket.on('completed', () => { this.onTutorialCompleted(); });
    this.socket.on('next', () => { this.slideshow.nextSlide(); });

    // Switch terminal => editor on 'edit' command hook
    this.socket.on('edit-start', (info: any) => {
      const chunks = [];
      this.socket.on('edit-content', (chunk: string) => chunks.push(chunk));
      this.socket.once('edit-error', (err: string) => console.error(err));
      this.socket.once('edit-close', () => {
        this.socket.off('edit-content'); // clear
        this.editFile({ path: info.path, content: chunks.join('') });
      });
    });

    // Extra logging reconnect_attempt
    this.socket.on('disconnect', () => {
      this.socket.connect();
    });
  }

  ngAfterViewInit(): void {
    this.slideshow.tutoId = this.tutoId;
  }

  /**
   * Disconnect to the backend socket
   */
  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.emit('destroy');
    }
    this.socket.close();
  }

  /**
   * Edit a file (trigerred by edit hook command)
   * @param info The file path and the content of the file
   */
  editFile(info: { path: string, content: string; }): void {
    this.model = { uri: info.path, value: info.content };
    this.editMode = true;
  }

  onEditorSave(value: string): void {
    this.ws.edit(this.tutoId, this.model.uri, value);
    //  .subscribe(() => console.log('written'), console.error);
  }

  onEditorQuit(): void {
    this.editMode = false;
  }

  attachTerminal(terminal: TerminalComponent): void {
    if (!environment.disableTerminal) {
      terminal.attach(this.socket);
    }
    this.socket.on('attached', () => { terminal.resize(); });
    this.socket.emit('attach', this.tutoId);
  }

  onTutorialCompleted(): void {
    const dialogRef = this.dialog.open(TutorialCompletedDialogComponent);

    dialogRef.afterClosed().subscribe((result: 'stay'|'leave') => {
      if (result == 'leave') {
        this.router.navigate(['home']);
      } else {
        // full viewport terminal
        const box = this.slideshowElement.nativeElement.parentNode.querySelector('.terminal-box');
        this.slideshowElement.nativeElement.remove();
        box.classList.add('full');
        setTimeout(() => this.terminal.resize(), 2100); // wait animation end
      }
    });
  }

  /**
   * FIXME: debugging purpose only
   */
  toggleEditMode(): void {
    this.editMode = !this.editMode;
  }

  /**
   * FIXME: debugging purpose only
   */
  nextSlide(): void {
    this.slideshow.nextSlide();
  }
}

@Component({
  selector: 'tutorial-completed-dialog',
  templateUrl: 'tutorial-completed-dialog.component.html'
})
export class TutorialCompletedDialogComponent {
  constructor(public dialogRef: MatDialogRef<TutorialCompletedDialogComponent>) { }

  close(state: 'stay'|'leave'): void {
    this.dialogRef.close(state);
  }
}
