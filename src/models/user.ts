import mongoose, {Schema} from 'mongoose';
import {USER_ROLES} from '@utils/constants';
import {UserDocument} from '@app/types/user';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           format: uuid
 *           description: Auto-generated MongoDB ObjectId
 *           example: "507f1f77bcf86cd799439011"
 *         username:
 *           type: string
 *           description: User display name or unique identifier
 *           example: "john_doe"
 *         email:
 *           type: string
 *           format: email
 *           description: Contact information (optional, if sending compliments by email)
 *           example: "john@example.com"
 *         password:
 *           type: string
 *           description: User password hashed with bcrypt
 *           example: "$2b$10$..."
 *         shares:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: Array of compliment IDs representing compliments sent by the user
 *           example: ["507f1f77bcf86cd799439012"]
 *         refreshToken:
 *           type: string
 *           description: Refresh token for user authentication
 *           example: "..."
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the user was created
 *           example: "2024-03-20T15:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the user was last updated
 *           example: "2024-03-20T15:30:00Z"
 *       example:
 *         _id: "507f1f77bcf86cd799439011"
 *         username: "john_doe"
 *         email: "john@example.com"
 *         password: "$2b$10$..."
 *         shares: ["507f1f77bcf86cd799439012"]
 *         refreshToken: "..."
 *         createdAt: "2023-01-01T00:00:00.000Z"
 *         updatedAt: "2023-01-01T00:00:00.000Z"
 */

const userSchema = new Schema<UserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      description: 'User display name or unique identifier',
    },
    email: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      index: true,
      description:
        'Contact information (optional, if sending compliments by email)',
    },
    password: {
      type: String,
      required: true,
      description: 'User password hashed with bcrypt',
    },
    refreshToken: {
      type: String,
      index: true,
    },
    roles: {
      type: [Number],
      enum: [USER_ROLES.ADMIN, USER_ROLES.USER],
      default: [USER_ROLES.USER],
    },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

export const User = mongoose.model<UserDocument>('User', userSchema);
