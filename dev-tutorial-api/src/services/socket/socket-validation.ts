import { AsyncWorker, ErrorCallback, queue, QueueObject } from 'async';
import * as debug from 'debug';
import { TtyLog } from '../docker/ttylog';
import { ValidationBatch } from './socket-validation-batch';
import { Validators } from '../validators/abstract/validators';

const batchLog = debug('app:socket-validation');

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
    batchLog('validate', batch.ttylog);
    await batch.validate(this.validators);
    callback();
  }

  setValidators(validators: Validators): void {
    batchLog('set validators');
    this.validators = validators;
  }

  output(data: string): void {
    this.batch.output += data;
  }

  ttylog(ttylog: TtyLog): void {
    batchLog('ttylog', ttylog);
    this.batch.ttylog = ttylog;
    this.end();
  }

  end(): void {
    void this.queue.push(this.batch);
    this.batch = new ValidationBatch();
  }
}
