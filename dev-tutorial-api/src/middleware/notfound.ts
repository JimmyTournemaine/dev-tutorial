import { RequestHandler, Request, Response } from 'express';
import { ErrorResponse } from '../models/error';

const handler = (_req: Request, res: Response) => res.status(404).json(new ErrorResponse('not found'));

export const notfound = (): RequestHandler => handler;
