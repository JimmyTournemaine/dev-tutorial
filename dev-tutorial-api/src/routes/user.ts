/* eslint-disable */
import { Router, Request, Response } from 'express';
import { ErrorResponse } from '../models/error';
import { IUser, User } from '../models/user';
import { PromiseHandler } from './helpers';
import { Token } from '../models/token';
import { environment } from '../environments/environment';
import { TokenService } from '../services/security/token';

const ts = new TokenService();

/**
 * Body interface for user registration
 *
 * @openapi
 * components:
 *   requestBodies:
 *     NewUserBody:
 *       description: User information
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 */
type NewUserBody = IUser;

const router = Router();

/**
 * Create a new user
 *
 * @param {Request} req The request
 * @param {Response} res The response
 *
 * @openapi
 * /user:
 *   post:
 *     summary: Identify a user (24h single access token).
 *     description: Return a token for a new user
 *     requestBody:
 *       $ref: '#/components/requestBodies/NewUserBody'
 *     responses:
 *       '201':
 *         description: The token object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Token'
 *       '400':
 *         description: The error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', new PromiseHandler(async (req: Request<unknown, unknown, NewUserBody>, res: Response<Token | ErrorResponse>): Promise<void> => {
  const { username } = req.body;

  const existingUser = await User.findOne({ username }).exec();
  if (existingUser) {
    res.status(400).json(new ErrorResponse(`Username '${username}' is already in use`));
    return;
  }

  const user = await new User(req.body).save();
  const token = ts.createAccessToken(user._id);

  res.cookie('refresh_token', ts.createRefreshToken(user._id), {
    httpOnly: true,
    maxAge: environment.tokens.refreshToken.expiresIn // 1 week
  }).status(201).json({
    userId: user._id,
    token: token,
  });

}).handler);

/**
 * Refresh a user token
 *
 * @param {Request} req The request
 * @param {Response} res The response
 *
 * @openapi
 * /user/refresh:
 *   put:
 *     summary: Refresh an access token.
 *     description: Return a token for a new user
 *     requestBody:
 *       schema:
 *         type: object
 *         properties:
 *           userId:
 *             type: string
 *           username:
 *             type: string
 *     responses:
 *       '201':
 *         description: The refreshed token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Token'
 *       '400':
 *         description: Malformed request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized access (refresh token missing or expired)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden access, trying to get access token from another user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: The user does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/refresh', new PromiseHandler(async (req: Request<unknown, unknown, {userId: string, username: string}>, res: Response<Token | ErrorResponse>): Promise<void> => {
  const { userId, username } = req.body;
  if (!userId || !username) {
    res.status(400).json(new ErrorResponse('Malformed request'));
    return;
  }

  // Check if user is legit
  const existingUser = await User.findOne({ username }).exec();
  if (!existingUser) {
    res.status(404).json(new ErrorResponse(`Unknown username '${username}'`));
    return;
  }

  // Check the refresh token
  if(!req.cookies || !('refresh_token' in req.cookies)) {
    res.status(401).send(new ErrorResponse('The refresh token is missing'));
    return;
  }

  // Check the refresh token is legit
  try {
    const refreshToken = ts.decodeRefreshToken(req.cookies['refresh_token']);
    if(refreshToken.userId != existingUser._id) {
      res.status(403).send(new ErrorResponse('The refresh token is not valid'));
      return;
    }

    // Everything is fine, token refreshing
    const token = ts.createAccessToken(userId);
    res.status(200).json({ userId, token });

  } catch {
    // invalid or expires refresh token
    res.status(401).send();
    return;
  }
}).handler);

export { router };
