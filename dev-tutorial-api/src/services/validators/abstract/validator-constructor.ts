/*

 FACTORY
 Validators automatic instanciations

 */

export type ValidatorConstructor<O, T> = { new(options: O): T; };
