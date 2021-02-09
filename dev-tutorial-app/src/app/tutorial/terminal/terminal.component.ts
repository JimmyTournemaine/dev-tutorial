import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild, ViewEncapsulation } from '@angular/core'

// Issue with types io.SocketClient
namespace io {
  export type Socket = any;
}

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TerminalComponent implements AfterViewInit {
  @ViewChild('term', { static: true }) terminalDiv: ElementRef;

  term: Terminal;
  socket: io.Socket;
  fitAddon: FitAddon;

  /**
   * Initialize the terminal view and bind IO on the given socket.
   */
  ngAfterViewInit (): void {
    // Addons
    this.fitAddon = new FitAddon()

    // Init term
    this.term = new Terminal({
      convertEol: true,
      cursorBlink: false,
      theme: { background: 'rgb(30,30,30)' }
    })
    this.term.loadAddon(this.fitAddon)
    this.term.open(this.terminalDiv.nativeElement)
  }

  write (data: string) {
    this.term.writeln(data)
  }

  attach (socket: io.Socket) {
    // Data exchange
    socket.on('show', (data) => {
      this.term.write(data.replace(/\r/g, '\n\r'))
    })
    this.term.onData((data) => socket.emit('cmd', data))

    // When socket is ended (why ??)
    socket.on('end', (status: any) => {
      this.term.clear()
      socket.disconnect()
    })

    this.term.onResize((size) => {
      socket.emit('resize', { h: size.rows, w: size.cols })
    })
  }

  @HostListener('window:resize', ['$event'])
  resize (): void {
    this.fitAddon.fit()
  }
}
