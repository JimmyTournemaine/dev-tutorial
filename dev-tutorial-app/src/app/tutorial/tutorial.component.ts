import { Component, OnInit, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { TerminalComponent } from './terminal/terminal.component';
import { EditorComponent } from './editor/editor.component';
import { NgxEditorModel } from 'ngx-monaco-editor';
import { SlideshowComponent } from './slideshow/slideshow.component';
import { TutorialsWebServices } from '../webservices/tutorials.webservices.service';
import * as io from 'socket.io-client';

@Component({
  selector: 'app-tutorial',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.css'],
})
export class TutorialComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('slide') slideshow: SlideshowComponent;

  @ViewChild('term', { static: false }) set terminalView(terminal: TerminalComponent) {
    if (terminal) {
      this.attachTerminal(terminal);
    }
  }

  @ViewChild('editor', { static: false }) set EditorView(editor: EditorComponent) {
    if (editor) {
      this.editor = editor;
    }
  }

  tutoId: string;
  socket: SocketIOClient.Socket;

  ready: boolean = false;
  disabled: boolean = false;

  editor: EditorComponent;
  editMode: boolean = false;
  model: NgxEditorModel;

  constructor(
    private route: ActivatedRoute,
    private ws: TutorialsWebServices,
  ) { }


  /**
   * Connect to the backend socket and get tutorial slides
   */
  ngOnInit(): void {
    this.socket = io(environment.socketEndpoint, { reconnection: false });

    this.route.paramMap.subscribe((params) => {
      this.tutoId = params['params']['slug'];
      if (environment.disableTerminal) {
        this.disabled = true;
      } else {
        this.ws.getReady(this.tutoId).subscribe(() => this.ready = true);
      }
    });

    // Next slide
    this.socket.on('next', () => { this.slideshow.nextSlide(); });

    // Switch terminal => editor on 'edit' command hook
    this.socket.on('edit-start', (info: any) => {
      console.log('info', info);
      const chunks = [];
      this.socket.on('edit-content', (chunk: string) => chunks.push(chunk));
      this.socket.once('edit-error', (err: string) => console.error(err));
      this.socket.once('edit-close', () => {
        this.socket.off('edit-content'); // clear
        this.editFile({ path: info.path, content: chunks.join('') });
      });
    });

    // Extra logging reconnect_attempt
    this.socket.on('disconnect', (reason) => {
      console.log('socket disconnected', reason);
      this.socket.connect();
    });
  }

  ngAfterViewInit(): void {
    console.log('view init', this.tutoId, this.slideshow);
    this.slideshow.tutoId = this.tutoId;
  }

  /**
   * Disconnect to the backend socket
   */
  ngOnDestroy(): void {
    if (this.socket) {
      console.warn('destroying app');
      this.socket.emit('destroy');
    }
    this.socket.close();
  }

  /**
   * Edit a file (trigerred by edit hook command)
   * @param info The file path and the content of the file
   */
  editFile(info: { path: string, content: string; }) {
    this.model = {uri: info.path, value: info.content };
    console.log(this.model);
    this.editMode = true;
  }

  onEditorSave(value: string) {
    this.ws.edit(this.tutoId, this.model.uri, value)
      .subscribe(() => console.log('written'), console.error);
  }

  onEditorQuit() {
    this.editMode = false;
  }

  attachTerminal(terminal: TerminalComponent) {
    if (!environment.disableTerminal) {
      terminal.attach(this.socket);
    }
    this.socket.on('attached', () => { terminal.resize(); });
    this.socket.emit('attach', this.tutoId);
  }

  /**
   * FIXME: debugging purpose only
   */
  toggleEditMode() {
    this.editMode = !this.editMode;
  }

  /**
   * FIXME: debugging purpose only
   */
  nextSlide() {
    this.slideshow.nextSlide();
  }

}
