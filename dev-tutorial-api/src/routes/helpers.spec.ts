import { expect } from 'chai';
import * as sinon from 'sinon';
import { ErrorResponse } from '../models/error';
import { FakeRequest } from '../utils/fake-request.utils.test';
import { FakeResponse } from '../utils/fake-response.utils.test';
import { PromiseHandler } from './helpers';

describe('Routes: Helper', () => {
  it('should handle async handlers', async () => {
    const req = new FakeRequest();
    const res = new FakeResponse();
    const next = sinon.spy();

    const ph = new PromiseHandler((rq, rs) => Promise.resolve(rs.status(204)));
    await ph.handler(req.asRequest(), res.asResponse(), next);

    expect(res.statusCode).to.equal(204);
    expect(next.notCalled).to.equal(true);
  });
  it('should handle async handlers errors', async () => {
    const req = new FakeRequest();
    const res = new FakeResponse();
    const next = sinon.spy();
    const error = new ErrorResponse('Oops!');

    const ph = new PromiseHandler(() => Promise.reject(error));
    await ph.handler(req.asRequest(), res.asResponse(), next);

    expect(next.calledOnceWithExactly(error)).to.equal(true);
  });
});
