import { EventEmitter } from "events";
import { DockerService, IDockerService, TtyLog } from "../../docker/docker";
import { ISocketService } from "../socket";
import * as debug from 'debug';
import { CommandParser } from "./command-parser";

const logger = debug('app:validator');

/*

 STRUCTURES
 Validators class hierarchy

*/

/**
 * Any validator should inherit validator
 */
export interface Validator<O> {
  injectService(service: Readonly<ISocketService>): void;
  validate(...arg: any): any;
}

export abstract class Validator<O> {
  constructor(protected options: O) { }
}

export abstract class PostValidator<O> extends Validator<O> {
  protected willValidate: boolean = true;

  async isValid(output: string, ttylog: TtyLog): Promise<boolean> {
    const isvalid = await this.validate(output, ttylog);
    if (isvalid) {
      this.willValidate = false; // when completed once
    }
    return isvalid;
  }

  canValidate(): boolean {
    return this.willValidate;
  }

  abstract validate(output: string, ttylog: TtyLog): Promise<boolean>;
}

interface PreValidatorOptions {
  cmd: string;
}

/**
 * Prevalidator: others validators will listen only after the command prevalidation.
 */
export class PreValidator extends Validator<PreValidatorOptions> {
  validate(cmd: string): boolean {
    if (cmd === undefined || cmd.trim().length === 0) {
      return false;
    }

    // TODO do something
    // console.log(CommandParser.parse(cmd));

    // Start with validation
    if (cmd.startsWith(this.options.cmd)) {
      return true;
    }

    // Trim, etc. to validate the command with eventually some typos
    const expected = this.options.cmd.split(' ').filter((v) => v);
    const given = cmd.split(' ').filter((v) => v);

    return expected.every((value: string, index: number, array: string[]) => {
      return value == given[index];
    });
  }
}

/*

 MANAGERS

 Manage validators in sequence of validators set to complete.
 Wait for prevalidation to complete to listen others events and validate them.
 When a set is completed, the system listen the next one.
 When all sets have been completed, execute a given callback.
 Ex: 
 [
   {
     input: '^mkdir',
     exitcode: 0,
   },
   {
     input: '^touch',
     creates: {type: directory, path: '/usr/src/my-project/README.md'}
   }
 ] 

*/

export class Validators extends EventEmitter {
  private sequence: ValidatorSequence;
  private current: ValidatorSet;

  constructor(sequence: ValidatorSequence) {
    super();
    this.sequence = sequence;
    this.current = sequence.get();
  }

  preValidate(cmd: string): boolean {
    return this.current.prevalidate(cmd);
  }

  async validate(output: string, ttylog: TtyLog) {
    await this.current.validate(output, ttylog);

    if (this.current.isValid()) {
      if (this.sequence.hasNext()) {
        this.current = this.sequence.next();
      } else {
        this.emit('valid');
      }
    }
  }
}

class ValidatorSequence {
  validators: ValidatorSet[];
  private currentIndex = 0;

  constructor(validators: ValidatorSet[]) {
    this.validators = validators;
  }

  get(): ValidatorSet {
    return this.validators[this.currentIndex];
  }
  next(): ValidatorSet {
    return this.validators[++this.currentIndex];
  }
  hasNext(): boolean {
    return this.currentIndex + 1 < this.validators.length;
  }
}

class ValidatorSet {
  prevalidator: PreValidator;
  prevalidated: boolean = false;

  validators: PostValidator<any>[];
  validated: number = 0;

  constructor(prevalidator: PreValidator, validators: PostValidator<any>[]) {
    this.prevalidator = prevalidator;
    this.validators = validators;
  }

  prevalidate(cmd: string): boolean {
    logger('prevalidation started', cmd);

    // optionnal prevalidation (but preferrable)
    this.prevalidated = this.prevalidator ? this.prevalidator.validate(cmd) : true;

    logger('prevalidation completed', this.prevalidated);

    return this.prevalidated;
  }

  /**
   * 
   * @param arg The validation arg
   */
  async validate(output: string, ttylog: TtyLog): Promise<void> {
    if (this.prevalidated) {
      logger('validation started');
      await this._validate(output, ttylog);
    } else {
      logger('validation skipped');
    }
  }

  private _validate(output: string, ttylog: TtyLog): Promise<boolean[]> {
    const validatorsInProcess = [];
    for (const validator of this.validators) {
      if (validator.canValidate()) {
        const process = Promise.resolve(validator.isValid(output, ttylog)).then((valid) => {
          if (valid) {
            this.validated++;
            logger('%s is valid (validated=%d/%s)', validator.constructor.name, this.validated, this.validators.length);
          } else {
            logger('%s is NOT valid (validated=%d/%s)', validator.constructor.name, this.validated, this.validators.length);
          }
          return valid;
        });
        validatorsInProcess.push(process);
      }
    }

    return Promise.all(validatorsInProcess);
  }

  isValid() {
    logger('is valid ? pre=%s, post=%s/%s', this.prevalidated, this.validated, this.validators.length);
    return this.prevalidated && this.validated == this.validators.length;
  }
}

/*

 FACTORY
 Validators automatic instanciations

 */
export type ValidatorConstructor<O, T> = { new(options: O): T; };
export class ValidatorFactory {
  static create<O, T extends Validator<O>>(type: ValidatorConstructor<O, T>, options: O, service?: ISocketService): T {
    const instance = new type(options);
    if (service && instance.injectService) {
      instance.injectService(service);
    }
    return instance;
  }
}

/*

 PARSER
 Will generate generators from tutorials descriptor 'tutorial.json'.

 */
export class ValidatorDescriptorsParser {
  /**
   * Create a Validators instance for a tutorial slides using JSON description.
   * @param service The SocketService
   * @param descriptor A slide validators descriptor
   */
  static create(service: ISocketService, descriptor: Array<Object>): Validators {
    const validationSeq = [];
    for (const validationSet of descriptor) {
      let prevalidator: PreValidator;
      const validators = [];
      for (const desc of Object.keys(validationSet)) {
        const mapping = descriptorMapping[desc];
        if (mapping === undefined) {
          throw new Error(`Unknown validator type ${desc}`);
        }
        const validator = ValidatorFactory.create(mapping.type, validationSet[desc], mapping.useService ? service : undefined);
        if (mapping.prevalidate) {
          if (prevalidator) {
            throw new Error('You must use only one prevalidator');
          }
          prevalidator = validator;
          logger('prevalidator: %s (from %s)', validator.constructor.name, desc);
        } else {
          validators.push(validator);
          logger('validator: %s (from %s)', validator.constructor.name, desc);
        }
      }
      validationSeq.push(new ValidatorSet(prevalidator, validators));
    }
    return new Validators(new ValidatorSequence(validationSeq));
  }
}

/*
  SIMPLE
  Standard validators to validate simple things.
*/
export interface ExitCodeValidatorOptions {
  exitCode: number;
}
export class ExitCodeValidator extends PostValidator<ExitCodeValidatorOptions> {
  constructor(options: ExitCodeValidatorOptions) {
    super(options);
  }
  async validate(_output: string, ttylog: TtyLog): Promise<boolean> {
    return ttylog.exitCode == this.options.exitCode;
  }
}

/*
  DOCKER
  Execute a command in the docker container to validate something
*/

interface DockerExecValidatorOptions { }
/**
 * Execute a command in a docker container to validate something.
 */
abstract class DockerExecValidator<O extends DockerExecValidatorOptions> extends PostValidator<O> {

  private command: string;
  private tutoId: string;
  private docker: IDockerService;

  constructor(command: string, options: O) {
    super(options);
    this.command = command;
  }

  setDockerService(docker: IDockerService) {
    this.docker = docker;
  }

  getDockerService(): IDockerService {
    return (this.docker) ? this.docker : DockerService.getInstance();
  }

  injectService(service: Readonly<ISocketService>) {
    this.tutoId = service.tutoId;
  }

  async validate(_output: string, _ttylog: TtyLog): Promise<boolean> {
    const stream = await this.getDockerService().exec(this.tutoId, this.command);
    return new Promise((resolve) => {
      const buffers = [];
      stream.onErr((chunk) => console.error('exec err \'%s\'', chunk));
      stream.onOut((chunk) => { buffers.push(chunk); });
      stream.onClose(() => {
        const stdout = Buffer.concat(buffers).toString();
        resolve(this.isStdoutValid(stdout.trim()));
      });
    });
  }
  protected abstract isStdoutValid(stdout: string): Promise<boolean>;
}

interface CreatesFileValidatorOptions {
  type: 'file';
  path: string;
  minLength?: number;
  maxLength?: number;
}
interface CreatesDirectoryValidatorOptions {
  type: 'directory';
  path: string;
}
interface CreatesAbsentValidatorOptions {
  type: 'absent';
  path: string;
}
type CreatesValidatorOptions = CreatesFileValidatorOptions | CreatesDirectoryValidatorOptions | CreatesAbsentValidatorOptions;

export class CreatesValidator extends DockerExecValidator<CreatesValidatorOptions> {

  static cmdArgs = {
    'file': '-f',
    'directory': '-d',
    'absent': '! -e'
  };

  constructor(options: CreatesValidatorOptions) {
    let command = `[[ ${CreatesValidator.cmdArgs[options.type]} ${options.path} ]]`;
    if (options.type == 'file' && options.minLength) {
      command += ` && [[ $(stat -c%s ${options.path}) -ge ${options.minLength} ]]`;
    }
    if (options.type == 'file' && options.maxLength) {
      command += ` && [[ $(stat -c%s ${options.path}) -le ${options.minLength} ]]`;
    }
    super(command + ' && echo \'OK\' || echo \'KO\'', options);
  }

  protected async isStdoutValid(stdout: string): Promise<boolean> {
    if (stdout == 'OK') {
      return true;
    } else if (stdout == 'KO') {
      return false;
    } else {
      throw new Error(`Unexpected output: "${stdout}"`);
    }
  }
}

/*
  MAPPING
  Map classes for Factory
*/

interface DescriptorMapping {
  type: ValidatorConstructor<any, any>;
  useService: boolean;
  prevalidate: boolean;
}

/**
 * List descriptor keys which can be used in tutorial.json
 */
type DescriptorKey = 'prevalidate' | 'input' | 'rc' | 'exitCode' | 'creates';

/**
 * Map keys with class and some extra informations
 */
const descriptorMapping: Record<DescriptorKey, DescriptorMapping> = {
  prevalidate: { type: PreValidator, useService: false, prevalidate: true },
  input: { type: PreValidator, useService: false, prevalidate: true },
  rc: { type: ExitCodeValidator, useService: false, prevalidate: false },
  exitCode: { type: ExitCodeValidator, useService: false, prevalidate: false },
  creates: { type: CreatesValidator, useService: true, prevalidate: false },
};

