import * as parser from 'bash-parser';
import * as debug from 'debug';
import { Command } from './command';
import { CommandBuilder } from './command-builder';

const logger = debug('app:command');

export class CommandParser {
  static SHORT_OPT = /^-[a-z0-9]+/;

  static LONG_OPT = /^--[a-z0-9-]+/;

  static parse(cmd: string): Command {
    logger(cmd);

    const ast = parser(cmd);
    let command: parser.Command;
    for (const c of ast.commands) {
      if (c.type === 'Pipeline') {
        [command] = c.commands; // parse only the first part
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
        if (node.type === 'Word') {
          const { text } = node as Record<string, string>;

          if (this.LONG_OPT.test(text)) {
            // Long options: --debug --tags=test,test2
            text.split('=').forEach((v) => builder.arg(v));
          } else if (this.SHORT_OPT.test(text)) {
            // Short options: -a -am -cvf
            for (const opt of text.substr(1)) {
              builder.arg(`-${opt}`);
            }
          } else {
            // Default
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
