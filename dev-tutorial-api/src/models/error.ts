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

}
