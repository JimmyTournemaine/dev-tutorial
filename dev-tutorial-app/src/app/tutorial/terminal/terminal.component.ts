import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TerminalComponent implements AfterViewInit {
  @ViewChild('term', { static: true }) terminalDiv: ElementRef;

  term: Terminal;

  socket: SocketIOClient.Socket;

  fitAddon: FitAddon;

  @HostListener('window:resize', ['$event'])
  resize(): void {
    this.fitAddon.fit();
  }

  /**
   * Initialize the terminal view and bind IO on the given socket.
   */
  ngAfterViewInit(): void {
    // Addons
    this.fitAddon = new FitAddon();

    // Init term
    this.term = new Terminal({
      convertEol: true,
      cursorBlink: false,
      theme: { background: 'rgb(30,30,30)' }
    });
    this.term.loadAddon(this.fitAddon);
    this.term.open(this.terminalDiv.nativeElement);
  }

  write(data: string): void {
    this.term.writeln(data);
  }

  attach(socket: SocketIOClient.Socket): void {
    // Data exchange
    socket.on('show', (data: string) => {
      this.term.write(data.replace(/\r/g, '\n\r'));
    });
    this.term.onData((data: string) => socket.emit('cmd', data));

    // When socket is ended (why ??)
    socket.on('end', (reason: unknown) => {
      console.error(reason);
      this.term.clear();
      socket.disconnect();
    });

    this.term.onResize((size) => {
      socket.emit('resize', { h: size.rows, w: size.cols });
    });
  }
}
