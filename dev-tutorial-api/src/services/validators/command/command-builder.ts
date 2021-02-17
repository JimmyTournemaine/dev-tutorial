import { Command } from './command';

export class CommandBuilder {
  private command: Command;

  private argKey: string;

  private argVal: string;

  constructor() {
    this.command = new Command();
  }

  name(name: string): this {
    this.command.name = name;
    return this;
  }

  arg(keyOrValue: string): this {
    this.command.addArg(keyOrValue);

    if (keyOrValue.startsWith('-')) {
      this.flushArg(); // flush previous
      this.argKey = keyOrValue;
    } else {
      this.argVal = keyOrValue;
    }
    return this;
  }

  build(): Command {
    this.flushArg();

    return this.command;
  }

  private flushArg(): void {
    if (this.argKey) {
      this.command.options.set(this.argKey, this.argVal);
      this.argKey = undefined;
      this.argVal = undefined;
    }
  }
}
