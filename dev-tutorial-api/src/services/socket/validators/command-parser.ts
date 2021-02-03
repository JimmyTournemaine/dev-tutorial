import * as parser from 'bash-parser';
import * as debug from 'debug';

const logger = debug('app:command');

class Command {

  /**
   * The command name
   */
  name: string;

  args: string[];

  /**
   * The command arguments as a map of possible key/value pairs.
   * 
   * It is not possible to be sure that the value following an options is the option value
   * (could be an argument following a flag).
   * ie: mkdir -p /root/test
   * 
   * An entry value should be considered as an option value only if it the expected behaviour
   * is a given validation context.
   */
  options: Map<string, string>;

  constructor() {
    this.args = [];
    this.options = new Map();
  }

  addOption(name: string, value: string): void {
    this.options.set(name, value);
  }
  addArg(value: string): void {
    this.args.push(value);
  }

  hasArg(value: string | RegExp): boolean {
    return this.args.some((arg) => this.matchArg(arg, value));
  }

  hasArgs(...values: (string | RegExp)[]): boolean {
    const found = this.args.findIndex((arg) => this.matchArg(arg, values[0]));

    if (found !== -1) {
      return values.slice(1).every((value, index) => {
        const argIndex = found + index + 1;
        return (argIndex < this.args.length) ? this.matchArg(this.args[argIndex], value) : false;
      });
    }
    return false;
  }

  is(name: string, ...values: (string | RegExp)[]): boolean {
    return name == this.name && (values.length == 0 || this.hasArgs(...values));
  }

  hasOption(option: string | RegExp, value?: string): boolean {
    for (const entry of this.options.entries()) {
      if (this.matchArg(entry[0], option)) {
        return !value || entry[1] === value;
      }
    }
    return false;
  }

  private matchArg(arg: string, toSearch: string | RegExp): boolean {
    return (typeof toSearch == 'string') ? arg.indexOf(toSearch) !== -1 : toSearch.test(arg);
  }
}

class CommandBuilder {
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

export class CommandParser {
  static SHORT_OPT = /^-[a-z0-9]+/;
  static LONG_OPT = /^--[a-z0-9-]+/;

  static parse(cmd: string): Command {
    logger(cmd);

    const ast = parser(cmd);
    let command: parser.Command;
    for (const c of ast.commands) {
      if (c.type == 'Pipeline') {
        command = c.commands[0]; // parse only the first part
      } else {
        command = c;
      }
    }

    return CommandParser.parseCommand(command);
  }

  private static parseCommand(parsed: parser.Command): Command {
    const builder = new CommandBuilder().name(parsed.name.text);

    if (parsed.suffix) {
      for (const node of parsed.suffix) {
        if (node.type == 'Word') {
          const text = node.text;

          // Long options: --debug --tags=test,test2
          if (this.LONG_OPT.test(text)) {
            text.split('=').forEach(v => builder.arg(v));
          }
          // Short options: -a -am -cvf
          else if (this.SHORT_OPT.test(text)) {
            for (const opt of text.substr(1)) {
              builder.arg('-' + opt);
            }
          }
          // Default
          else {
            builder.arg(text);
          }
        } else {
          logger('Ignored node (not handled yet)', node);
        }
      }
    }
    return builder.build();
  }
}
