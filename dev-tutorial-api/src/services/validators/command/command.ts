export class Command {
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
    this.options = new Map<string, string>();
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
    return name === this.name && (values.length === 0 || this.hasArgs(...values));
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
    return (typeof toSearch === 'string') ? arg.indexOf(toSearch) !== -1 : toSearch.test(arg);
  }
}
