import { Response } from 'express';
import { ErrorResponse } from '../models/error';

/**
 * A partially implements Response for middleware testing
 */
export class FakeResponse<T> implements Partial<Response<T | ErrorResponse>> {
  body: T | ErrorResponse;

  statusCode: number;

  locals: Record<string, unknown> = {};

  status(code: number): Response<T | ErrorResponse> {
    this.statusCode = code;
    return this.asResponse();
  }

  json(body?: T | ErrorResponse): Response<T | ErrorResponse> {
    this.body = body;
    return this.asResponse();
  }

  asResponse(): Response<T | ErrorResponse> {
    return this as unknown as Response<T | ErrorResponse>;
  }

  toString(): string {
    return JSON.stringify({ ...this });
  }
}
