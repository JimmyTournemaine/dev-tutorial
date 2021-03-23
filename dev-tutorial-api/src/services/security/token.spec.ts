import { expect } from 'chai';
import { TokenService } from './token';

describe('Security: JWT Tokens', () => {
  let service: TokenService;

  before(() => { service = new TokenService(); });

  it('should create an access token', async () => {
    const userId = 'my-user-id';

    const before1 = Date.now();
    const token1 = service.createAccessToken(userId);
    const after1 = Date.now();

    const decoded = service.decodeAccessToken(token1);

    // valid token
    expect(decoded.userId).to.equals(userId);
    expect(before1).lte(decoded.createdAt);
    expect(decoded.createdAt).lte(after1);

    // renewed token must be different
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    const token2 = service.createAccessToken(userId);
    expect(token1).not.equals(token2);
  });

  it('should create a refresh token', async () => {
    const userId = 'my-user-id';

    const before1 = Date.now();
    const token1 = service.createRefreshToken(userId);
    const after1 = Date.now();

    const decoded = service.decodeRefreshToken(token1);

    // valid token
    expect(decoded.userId).to.equals(userId);
    expect(before1).lte(decoded.createdAt);
    expect(decoded.createdAt).lte(after1);

    // renewed token must be different
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    const token2 = service.createRefreshToken(userId);
    expect(token1).not.equals(token2);
  });
});
