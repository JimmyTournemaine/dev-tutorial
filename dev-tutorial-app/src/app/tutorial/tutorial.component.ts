import { Component, OnInit, AfterViewInit, ViewChild, OnDestroy, ElementRef } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as io from 'socket.io-client';
import { map, take, tap } from 'rxjs/operators';
import { interval, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TerminalComponent } from './terminal/terminal.component';
import { EditorComponent } from './editor/editor.component';
import { SlideshowComponent } from './slideshow/slideshow.component';
import { TutorialsWebServices } from '../ws/tutorial.ws.service';
import { EditorService } from './editor/editor.service';
import { createModel, NgxEditorModel } from './editor/editor-utils';
import { retryWhen } from '../utils/observable.utils';
import { AuthService } from '../auth/auth.service';

type TutoState = 'disabled' | 'creating' | 'ready' | 'error';

@Component({
  selector: 'app-tutorial-completed-dialog',
  template: `
    <h2 mat-dialog-title>Bravo !</h2>
    <mat-dialog-content class="mat-typography">
      <h3>Tutoriel terminé avec succès</h3>
      <p>Vous avez termine toutes les etapes du tutoriel.</p>
      <p>Vous pouvez decider de retourner au menu principal
        ou rester sur cette page pour continuer a jouer avec l'environnement</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close('stay')">Rester</button>
      <button mat-button (click)="close('leave')">Quitter</button>
    </mat-dialog-actions>
  `
})
export class TutorialCompletedDialogComponent {
  constructor(public dialogRef: MatDialogRef<TutorialCompletedDialogComponent>) { }

  /**
   * Close the dialog box.
   *
   * @param state The state on close.
   */
  close(state: 'stay' | 'leave'): void {
    this.dialogRef.close(state);
  }
}

@Component({
  selector: 'app-tutorial',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.css']
})
export class TutorialComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('slide') slideshow: SlideshowComponent;

  @ViewChild('term', { static: false }) set terminalView(terminal: TerminalComponent) {
    if (terminal) {
      this.attachTerminal(terminal);
      this.terminal = terminal;
    }
  }

  @ViewChild('editor') editor: EditorComponent;

  @ViewChild('slideshow') private slideshowElement: ElementRef;

  tutoId: string;

  socket: SocketIOClient.Socket;

  terminal: TerminalComponent;

  state: TutoState = 'creating';

  progressValue: Observable<number>;

  editMode = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private ws: TutorialsWebServices,
    private editorService: EditorService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) { }

  /**
   * Connect to the backend socket and get tutorial slides.
   *
   * When `ready` is set to `true`, terminal will be rendered and `attachTerminal` will be trigerred.
   *
   * @see ~attachTerminal
   */
  ngOnInit(): void {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.tutoId = params.get('slug');
      if (environment.disableTerminal) {
        this.state = 'disabled';
      } else {
        this.ws.getReady(this.tutoId)
          .pipe(
            // On error, retry to start environment in 10s, following countdown with a progress bar
            tap({
              error: () => {
                this.state = 'error';
                this.progressValue = interval(100).pipe(map(v => 1 + v), take(100));
                this.progressValue.subscribe();
              }
            }),
            retryWhen({
              retries: 1,
              delay: 10000,
              do: () => { this.state = 'creating'; }
            })
          )
          .subscribe(() => {
            this.initSocket();
            this.state = 'ready';
          });
      }
    });

    this.editorService.save.subscribe((model: NgxEditorModel) => this.onEditorSave(model));
    this.editorService.close.subscribe(() => this.onEditorQuit());
  }

  /**
   * Set the current tutorial identifier to load the slides.
   */
  ngAfterViewInit(): void {
    this.slideshow.tutoId = this.tutoId;
  }

  /**
   * Disconnect to the backend socket
   */
  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.close();
    }
  }

  /**
   * Edit a file (trigerred by edit hook command)
   *
   * @param info The file path and the content of the file
   * @param info.path The file path
   * @param info.content The file content
   */
  editFile(info: { path: string; content: string }): void {
    this.editorService.addEditor(createModel(info.path, info.content));
    this.editMode = true;
  }

  /**
   * When the editor trigger a 'save' event.
   *
   * @param model The modified model.
   */
  onEditorSave(model: NgxEditorModel): void {
    this.ws.edit(this.tutoId, model.uri, model.value).subscribe();
  }

  /**
   * When the editor trigger a 'close' event.
   * Switch to the terminal mode.
   */
  onEditorQuit(): void {
    this.editMode = false;
  }

  /**
   * Attach a terminal component to the socket service.
   *
   * @param terminal The terminal component to attahc
   */
  attachTerminal(terminal: TerminalComponent): void {
    if (!environment.disableTerminal) {
      terminal.attach(this.socket);
    }
    this.socket.on('attached', () => {
      terminal.resize();
    });
    this.socket.emit('attach', this.tutoId);
  }

  /**
   * Triggered when the tutorial is completed.
   * Display a dialogbox to ask the user if he wants to stay playing with the environment
   *  or wants to leave.
   */
  onTutorialCompleted(): void {
    const dialogRef = this.dialog.open(TutorialCompletedDialogComponent);

    dialogRef.afterClosed().subscribe((result: 'stay' | 'leave') => {
      if (result === 'leave') {
        void this.router.navigate(['home']);
      } else {
        // full viewport terminal
        const box = this.slideshowElement.nativeElement.parentNode.querySelector('.terminal-box');
        this.slideshowElement.nativeElement.remove();
        box.classList.add('full');
        setTimeout(() => this.terminal.resize(), 2100); // wait animation end
      }
    });
  }

  private initSocket() {
    const handleError = (err: string|Error) => {
      const error = (err as Error).message || err as string;
      this.snackBar.open(error, 'dismiss', {
        duration: 3000,
      });
    };
    this.socket = io(environment.socketEndpoint, { query: { token: this.auth.getToken() } });
    this.socket.on('error', handleError);
    this.socket.on('err', handleError);

    // Next slide
    this.socket.on('completed', () => { this.onTutorialCompleted(); });
    this.socket.on('next', () => { this.slideshow.nextSlide(); });

    // Switch terminal => editor on 'edit' command hook
    this.socket.on('edit-start', (info: { path: string }) => {
      const chunks: string[] = [];
      this.socket.on('edit-content', (chunk: string) => chunks.push(chunk));
      this.socket.once('edit-error', (err: string) => console.error(err));
      this.socket.once('edit-close', () => {
        this.socket.off('edit-content'); // clear
        this.editFile({ path: info.path, content: chunks.join('') });
      });
    });
  }
}
