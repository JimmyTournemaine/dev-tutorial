import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../models/error';

type Handler = (req: Request, res: Response, next?: NextFunction) => Promise<void | Response<unknown>>;

/**
 * A handler wrapper that will call next on async request handler error.
 *
 * @deprecated Will be handled automatically in ExpressJS 5 : {@link https://expressjs.com/en/guide/error-handling.html}.
 */
export class PromiseHandler {
  /**
   * Bind the original handler
   *
   * @param originalHandler An async request handler
   * @returns The handler response.
   */
  constructor(private originalHandler: Handler) {
  }

  public handler: Handler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return await this.originalHandler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}
