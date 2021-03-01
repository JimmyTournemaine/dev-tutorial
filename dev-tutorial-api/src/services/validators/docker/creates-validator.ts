import { DockerExecValidator } from './docker-exec-validator';

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
    file: '-f',
    directory: '-d',
    absent: '! -e',
  };

  constructor(options: CreatesValidatorOptions) {
    let command = `[[ ${CreatesValidator.cmdArgs[options.type]} ${options.path} ]]`;
    if (options.type === 'file' && options.minLength) {
      command += ` && [[ $(stat -c%s ${options.path}) -ge ${options.minLength} ]]`;
    }
    if (options.type === 'file' && options.maxLength) {
      command += ` && [[ $(stat -c%s ${options.path}) -le ${options.minLength} ]]`;
    }
    super(`${command} && echo 'OK' || echo 'KO'`, options);
  }

  protected isStdoutValid(stdout: string): Promise<boolean> {
    if (stdout === 'OK') {
      return Promise.resolve(true);
    } if (stdout === 'KO') {
      return Promise.resolve(false);
    }
    throw new Error(`Unexpected output: "${stdout}"`);
  }
}
