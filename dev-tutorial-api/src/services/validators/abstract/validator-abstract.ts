import { ISocketService } from '../../socket/socket-interface';

/*

 STRUCTURES
 Validators class hierarchy

*/
/**
 * Any validator should inherit validator
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Validator<O, P, R> {
  injectService(service: Readonly<ISocketService>): void;
  validate(args: P): R;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
abstract class Validator<O, P, R> {
  constructor(protected options: O) { }
}
export { Validator };
