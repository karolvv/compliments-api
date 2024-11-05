import {Schema, model, Model} from 'mongoose';
import {ComplimentDocument} from '@app/types/compliment';

/**
 * @swagger
 * components:
 *   schemas:
 *     Compliment:
 *       type: object
 *       required:
 *         - text
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *           description: The auto-generated MongoDB document ID
 *           example: "507f1f77bcf86cd799439011"
 *         text:
 *           type: string
 *           description: The compliment text
 *           minLength: 1
 *           example: "You have a wonderful smile!"
 *         authorId:
 *           type: string
 *           format: objectId
 *           description: ID of the user who created it (if user-generated) or null if pre-made
 *           nullable: true
 *           ref: User
 *           example: "507f1f77bcf86cd799439011"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the compliment was created
 *           example: "2024-03-20T15:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the compliment was last updated
 *           example: "2024-03-20T15:30:00Z"
 *       example:
 *         _id: "507f1f77bcf86cd799439011"
 *         text: "You have a wonderful smile!"
 *         authorId: "507f1f77bcf86cd799439012"
 *         createdAt: "2024-03-20T15:30:00Z"
 *         updatedAt: "2024-03-20T15:30:00Z"
 */

const complimentSchema = new Schema<ComplimentDocument>(
  {
    text: {
      type: String,
      required: true,
      description: 'The compliment text',
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      description:
        'ID of the user who created it (if user-generated) or null if pre-made',
    },
  },
  {
    timestamps: true,
  },
);

export const Compliment: Model<ComplimentDocument> = model<ComplimentDocument>(
  'Compliment',
  complimentSchema,
);
