/**
 * Error response
 *
 * @openapi
 * components:
 *   schemas:
 *     Error:
 *       properties:
 *         name:
 *           type: string
 *         message:
 *           type: string
 *       required:
 *         - name
 *         - message
 */
export class ErrorResponse {
  name = 'DEV_TUTO_ERROR';

  message: string;

  constructor(cause: string|Error) {
    this.message = typeof cause === 'string' ? cause : cause.message;
  }
}
