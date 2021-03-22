import * as mongoose from 'mongoose';

/**
 * User model type (for document creation)
 *
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       properties:
 *         username:
 *           type: string
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 *       required:
 *         - username
 */
export interface IUser {
  username: string;
}

/**
 * User Document type (returned by MongoDB)
 */
interface UserDocument extends IUser, mongoose.Document {

}

/**
 * User Model interface
 */
interface UserModelInterface extends mongoose.Model<UserDocument> {
  build(attr: IUser): UserDocument;
}

const userSchema = new mongoose.Schema<UserModelInterface>({
  username: {
    type: String,
    required: true,
    unique: true,
  }
});

const statics = userSchema.statics as UserModelInterface;
// static.build has to be defined before TutorialDescriptor declaration, otherwise build method does not exist
// eslint-disable-next-line @typescript-eslint/no-use-before-define
statics.build = (attr: IUser): UserDocument => new User(attr);

const User = mongoose.model<UserDocument, UserModelInterface>(
  'User',
  userSchema
);

export { User, UserDocument };
