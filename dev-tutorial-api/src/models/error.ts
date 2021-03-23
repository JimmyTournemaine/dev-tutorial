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
export class ErrorResponse extends Error {
  constructor(cause: string|Error) {
    super(typeof cause === 'string' ? cause : cause.message);
    this.stack = undefined;
  }
}
