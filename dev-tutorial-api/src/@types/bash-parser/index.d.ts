declare module 'bash-parser' {

  namespace parse {

    type ParseOptions = unknown;

    type AstNode = Record<string, unknown>;

    interface Op extends AstNode {
      type: 'great';
      text: string;
    }
    interface Word extends AstNode {
      type: 'Word';
      text: string;
      expansion?: unknown;
    }

    interface Command extends AstNode {
      type: 'Command';
      name: Word;
      suffix?: AstNode[];
    }
    interface Redirect extends AstNode {
      type: 'Redirect';
      op: Op;
      file: AstNode;
      numberIo?: AstNode;
    }
    interface Pipeline extends AstNode {
      type: 'Pipeline';
      commands: Command[];
    }
    interface Script extends AstNode {
      type: 'Script';
      commands: (Command | Pipeline)[];
    }

    type Ast = Script;

    interface Parse {
      (sourceCode: string, options?: ParseOptions): Ast;
    }

  }

  const parse: parse.Parse & { parse: parse.Parse; default: parse.Parse; };
  export = parse;
}
