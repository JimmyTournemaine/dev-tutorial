declare module 'bash-parser' {

  const parse: parse.Parse & { parse: parse.Parse; default: parse.Parse };
  export = parse;

  namespace parse {
    interface Parse {
      (sourceCode: string, options?: ParseOptions): Ast;
    }

    type ParseOptions = any;

    type AstNode = Op | Word | Command | Script | Pipeline | Redirect;

    interface Op {
      type: 'great';
      text: string;
    }
    interface Word {
      type: 'Word';
      text: string;
      expansion?: any;
    }
    interface Command {
      type: 'Command';
      name: Word;
      suffix?: AstNode[];
    }
    interface Redirect {
      type: 'Redirect';
      op: Op;
      file: AstNode;
      numberIo?: AstNode;
    }
    interface Pipeline {
      type: 'Pipeline';
      commands: Command[];
    }
    interface Script {
      type: 'Script';
      commands: (Command | Pipeline)[];
    }
    type Ast = Script;
  }
}
