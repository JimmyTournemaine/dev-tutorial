import * as debug from 'debug';

const logger = debug('app:hook');

interface HookOptions {
  name: 'edit';
  regexp: RegExp;
  cancel: boolean;
  action: (res: RegExpExecArray) => Promise<void>;
}

export class Hook {
  constructor(private options: HookOptions) { }

  test(cmd: string): boolean {
    return this.options.regexp.test(cmd);
  }

  shouldCancel(): boolean {
    return this.options.cancel;
  }

  async process(cmd: string): Promise<void> {
    logger(`processing ${this.options.name}`);
    return this.options.action(this.options.regexp.exec(cmd));
  }
}
