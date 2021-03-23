/**
 * User model type (for document creation)
 *
 * @openapi
 * components:
 *   schemas:
 *     Token:
 *       properties:
 *         userId:
 *           type: string
 *         token:
 *           type: string
 *       required:
 *         - userId
 *         - token
 */
export interface Token {
  userId: string;
  token: string;
}
