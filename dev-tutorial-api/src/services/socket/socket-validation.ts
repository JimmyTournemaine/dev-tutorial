import { AsyncWorker, ErrorCallback, queue, QueueObject } from 'async';
import { TtyLog } from '../docker/ttylog';
import { ValidationBatch } from './socket-validation-batch';
import { Validators } from '../validators/abstract/validators';
import { LoggerFactory } from '../logger/logger';

const logger = LoggerFactory.getLogger('app:validation');

export class Validation {
  private batch: ValidationBatch = new ValidationBatch();

  private validators: Validators;

  private worker: AsyncWorker<ValidationBatch, Error>;

  private queue: QueueObject<ValidationBatch>;

  constructor() {
    this.worker = async (batch: ValidationBatch, callback: ErrorCallback<Error>) => this.validateBatch(batch, callback);
    this.queue = queue(this.worker, 1);
  }

  async validateBatch(batch: ValidationBatch, callback: ErrorCallback<Error>): Promise<void> {
    logger.debug('validate', batch.ttylog);
    await batch.validate(this.validators);
    callback();
  }

  setValidators(validators: Validators): void {
    logger.debug('set validators');
    this.validators = validators;
  }

  output(data: string): void {
    this.batch.output += data;
  }

  ttylog(ttylog: TtyLog): void {
    logger.debug('ttylog', ttylog);
    this.batch.ttylog = ttylog;
    this.end();
  }

  end(): void {
    void this.queue.push(this.batch);
    this.batch = new ValidationBatch();
  }
}
