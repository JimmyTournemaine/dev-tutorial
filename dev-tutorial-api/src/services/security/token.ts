import * as jwt from 'jsonwebtoken';
import { environment } from '../../environments/environment';

export type Identity = { userId: string };
export type Timestamped = { createdAt: number };

export class TokenService {
  createAccessToken(userId: string): string {
    const conf = environment.tokens.accessToken;
    return this.createToken({ userId }, conf.secret, conf.expiresIn);
  }

  decodeAccessToken(token: string): Identity & Timestamped {
    const conf = environment.tokens.accessToken;
    return this.decode<Identity>(token, conf.secret);
  }

  createRefreshToken(userId: string): string {
    const conf = environment.tokens.refreshToken;
    return this.createToken({ userId }, conf.secret, conf.expiresIn);
  }

  decodeRefreshToken(token: string): Identity & Timestamped {
    const conf = environment.tokens.refreshToken;
    return this.decode<Identity>(token, conf.secret);
  }

  private decode<T extends Record<string, unknown>>(token: string, secret: string): T & Timestamped {
    return jwt.verify(token, secret) as T & Timestamped;
  }

  private createToken<T extends Record<string, unknown>>(payload: T, secret: string, expiresIn: number): string {
    return jwt.sign({ createdAt: Date.now(), ...payload }, secret, { expiresIn });
  }
}
