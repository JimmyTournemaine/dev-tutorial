import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ValidationError } from 'express-openapi-validator/dist/framework/types';
import { ErrorResponse } from '../models/error';

/**
 * @param err
 */
function isValidationError(err: ValidationError | Error): err is ValidationError {
  return (err as ValidationError).errors !== undefined;
}

const handler = (
  err: ValidationError | Error,
  _req: Request<unknown, unknown, unknown, unknown>,
  res: Response<unknown>,
  next: NextFunction
): void => {
  // OAS Validation Error
  if (isValidationError(err)) {
    const { message, errors } = err;
    res.status(err.status || 500).json({ name: 'DEV_TUTO_VALIDATION_ERROR', message, errors });
  } else { // Default errors
    res.status(500).json(new ErrorResponse(err));
  }
  next();
};

export const finalhandler = (): ErrorRequestHandler => handler;
