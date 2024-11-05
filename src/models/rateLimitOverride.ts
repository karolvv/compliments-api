import {RateLimitOverrideDocument} from '@app/types/rateLimiter';
import mongoose, {Schema} from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     RateLimitOverride:
 *       type: object
 *       required:
 *         - path
 *         - windowMs
 *         - maxRequests
 *         - authenticatedMaxRequests
 *         - startsAt
 *         - expiresAt
 *       properties:
 *         path:
 *           type: string
 *           description: The API path this rate limit override applies to
 *         windowMs:
 *           type: number
 *           description: The time window in milliseconds for the rate limit
 *         maxRequests:
 *           type: number
 *           description: The maximum number of requests allowed in the time window
 *         authenticatedMaxRequests:
 *           type: number
 *           description: The maximum number of requests allowed for authenticated users in the time window
 *         startsAt:
 *           type: string
 *           format: date-time
 *           description: The start time for the rate limit override
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: The expiration time for the rate limit override
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created this override
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp when this override was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp when this override was last updated
 */

const rateLimitOverrideSchema = new Schema<RateLimitOverrideDocument>(
  {
    path: {
      type: String,
      required: true,
      index: true,
      description: 'The API path this rate limit override applies to',
    },
    windowMs: {
      type: Number,
      required: true,
      description: 'The time window in milliseconds for the rate limit',
    },
    maxRequests: {
      type: Number,
      required: true,
      description: 'The maximum number of requests allowed in the time window',
    },
    authenticatedMaxRequests: {
      type: Number,
      required: true,
      description:
        'The maximum number of requests allowed for authenticated users in the time window',
    },
    startsAt: {
      type: Date,
      required: true,
      index: true,
      description: 'The start time for the rate limit override',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      description: 'The expiration time for the rate limit override',
    },
    createdBy: {
      type: String,
      description: 'The ID of the user who created this override',
    },
  },
  {
    timestamps: true,
  },
);

export const RateLimitOverride = mongoose.model<RateLimitOverrideDocument>(
  'RateLimitOverride',
  rateLimitOverrideSchema,
);
