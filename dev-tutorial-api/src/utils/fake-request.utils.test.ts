import { Request } from 'express';
import { IncomingHttpHeaders } from 'http';

/**
 * A partially implements Request for middleware testing
 */
export class FakeRequest implements Partial<Request> {
  headers: IncomingHttpHeaders = {};

  body: Record<string, unknown> = {};

  constructor(values?: { body?: Record<string, unknown>, headers?: IncomingHttpHeaders; }) {
    if (values) {
      this.body = values.body;
      this.headers = values.headers;
    }
  }

  asRequest(): Request {
    return this as unknown as Request;
  }
}
