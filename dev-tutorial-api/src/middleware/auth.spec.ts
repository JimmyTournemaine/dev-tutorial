import { expect } from 'chai';
import * as sinon from 'sinon';
import { ErrorResponse } from '../models/error';
import { TokenService } from '../services/security/token';
import { FakeResponse } from '../utils/fake-response.utils.test';
import { FakeRequest } from '../utils/fake-request.utils.test';
import { appAuth, socketAuth } from './auth';

describe('Middleware: Authentication', () => {
  let token: string;

  before(() => {
    token = new TokenService().createAccessToken('my-user-id');
  });

  describe('Application Authentication Middleware', () => {
    it('should authenticate the user', () => {
      const req = new FakeRequest({ headers: { authorization: `Bearer ${token}` } });
      const res = new FakeResponse<void>();
      const nextSpy = sinon.spy();

      appAuth(req.asRequest(), res.asResponse(), nextSpy);

      expect(nextSpy.calledOnceWith()).to.equal(true);
      expect(res.locals).to.have.property('decoded');
    });

    it('should deny access to an user with invalid token', () => {
      const req = new FakeRequest({ headers: { authorization: 'Bearer thisisnotavalidtoken' } });
      const res = new FakeResponse<void>();
      const nextSpy = sinon.spy();

      appAuth(req.asRequest(), res.asResponse(), nextSpy);

      expect(nextSpy.notCalled).to.equal(true);
      expect(res.statusCode).to.equals(401);
      expect(res.body).to.be.an.instanceOf(ErrorResponse);
    });

    it('should deny access to an user without token', () => {
      const req = new FakeRequest();
      const res = new FakeResponse<void>();
      const nextSpy = sinon.spy();

      appAuth(req.asRequest(), res.asResponse(), nextSpy);

      expect(nextSpy.notCalled).to.equal(true);
      expect(res.statusCode).to.equals(401);
      expect(res.body).to.be.an.instanceOf(ErrorResponse);
    });

    it('should deny access if unexpected behavior happens', () => {
      const req = new FakeRequest({ headers: null });
      const res = new FakeResponse<void>();
      const nextSpy = sinon.spy();

      appAuth(req.asRequest(), res.asResponse(), nextSpy);

      expect(nextSpy.notCalled).to.equal(true);
      expect(res.statusCode).to.equals(401);
      expect(res.body).to.be.an.instanceOf(ErrorResponse);
    });
  });
  describe('Socket Authentication Middleware', () => {
    it('should authenticate the user', () => {
      const nextSpy = sinon.spy();
      const socket = { socket: { handshake: { query: { token } } } } as unknown as SocketIO.Socket;

      socketAuth(socket, nextSpy);

      expect(nextSpy.calledOnceWith()).to.equal(true);
    });
    it('should reject an invalid token', () => {
      const nextSpy = sinon.spy();
      const socket = { handshake: { query: { token: 'thisisabullshittoken' } } } as unknown as SocketIO.Socket;

      socketAuth(socket, nextSpy);

      expect(nextSpy.calledOnce).to.equal(true);
      expect(nextSpy.getCall(0).firstArg).to.be.an.instanceOf(ErrorResponse);
      expect((nextSpy.getCall(0).firstArg as ErrorResponse).message).to.contain('malformed');
    });
    it('should reject an handshake without access token', () => {
      const nextSpy = sinon.spy();
      const socket = { handshake: { query: {} } } as unknown as SocketIO.Socket;

      socketAuth(socket, nextSpy);

      expect(nextSpy.calledOnce).to.equal(true);
      expect(nextSpy.getCall(0).firstArg).to.be.an.instanceOf(ErrorResponse);
      expect((nextSpy.getCall(0).firstArg as ErrorResponse).message).to.equal('Authentication error');
    });
  });
});
