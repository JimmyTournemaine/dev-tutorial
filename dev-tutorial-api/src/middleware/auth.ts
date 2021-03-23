import { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import { ErrorResponse } from '../models/error';
import { TokenService } from '../services/security/token';

type Identified = { userId: string; };
export type IdentifiedSocket = SocketIO.Socket & {
  ident: Identified;
};

const ts = new TokenService();

export const appAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.headers || !('authorization' in req.headers)) {
    res.status(401).json(new ErrorResponse('No access token provided'));
    return;
  }
  try {
    res.locals.decoded = ts.decodeAccessToken(req.headers.authorization.split(' ')[1]);
    next();
  } catch (err) {
    if (err instanceof JsonWebTokenError) {
      res.status(401).json(new ErrorResponse(err));
    } else {
      next(err);
    }
  }
};

export const socketAuth = (socket: SocketIO.Socket, next: NextFunction): void => {
  try {
    if (socket.handshake.query && socket.handshake.query.token) {
      // eslint-disable-next-line no-param-reassign
      (socket as IdentifiedSocket).ident = ts.decodeAccessToken(socket.handshake.query.token);
      next();
    } else {
      throw new ErrorResponse('Authentication error');
    }
  } catch (err) {
    next(new ErrorResponse(err));
  }
};
