import {RateLimitOverrideService} from '@services/rateLimitOverride';
import {Request, Response, NextFunction} from 'express';
import logger from '@utils/logger';
import z from 'zod';
import {TIME_IN_MS} from '@utils/constants';
import {ValidationError} from '@utils/errors';
import {Types} from 'mongoose';

export class RateLimitOverrideController {
  private rateLimitOverrideService: RateLimitOverrideService;

  constructor(rateLimitOverrideService: RateLimitOverrideService) {
    this.rateLimitOverrideService = rateLimitOverrideService;
  }

  /**
   * Get recent overrides
   */
  async getRecentOverrides(req: Request, res: Response, next: NextFunction) {
    try {
      // VALIDATE
      const querySchema = z.object({
        path: z.string().optional(),
      });
      const {path} = querySchema.parse(req.query);

      // LOGIC
      const overrides =
        await this.rateLimitOverrideService.getRecentOverrides(path);

      // RESPONSE
      res.json(overrides);
    } catch (error) {
      logger.error('Error fetching recent overrides', {error});
      next(error);
    }
  }

  async getActivePathOverrides(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // VALIDATE
      const querySchema = z.object({
        path: z.string().optional(),
      });
      const {path} = querySchema.parse(req.query);

      // LOGIC
      const overrides =
        await this.rateLimitOverrideService.getActivePathOverrides(path);

      // RESPONSE
      res.json(overrides);
    } catch (error) {
      logger.error('Error fetching active path overrides', {error});
      next(error);
    }
  }

  async createOverride(req: Request, res: Response, next: NextFunction) {
    try {
      // VALIDATE
      // Define validation schemas
      const bodySchema = z.object({
        path: z.string().min(1, 'Path is required and cannot be empty'),
        maxRequests: z.number().positive('Max requests must be positive'),
        authenticatedMaxRequests: z
          .number()
          .positive('Authenticated max requests must be positive'),
        startDate: z
          .string()
          .min(1, 'Start date is required')
          .refine(
            date => !isNaN(Date.parse(date)),
            'Invalid start date format',
          ),
        durationHours: z.number().positive('Duration must be positive'),
      });

      // Validate & parse request body
      const {
        path,
        startDate,
        durationHours,
        maxRequests,
        authenticatedMaxRequests,
      } = bodySchema.parse(req.body);

      // Validate user id
      if (!Types.ObjectId.isValid(req.user.id)) {
        throw new ValidationError('Invalid user ID');
      }
      // LOGIC

      await this.rateLimitOverrideService.createOverrideWindow(
        path,
        {
          windowMs: durationHours * TIME_IN_MS.ONE_HOUR,
          maxRequests,
          authenticatedMaxRequests,
        },
        new Date(startDate),
        durationHours,
        req.user.id,
      );

      // RESPONSE
      res.json({success: true, message: 'Rate limit override configured'});
    } catch (error) {
      logger.error('Error creating rate limit override', {error});
      next(error);
    }
  }

  async removeOverride(req: Request, res: Response, next: NextFunction) {
    try {
      // VALIDATE
      // Define validation schemas
      const bodySchema = z.object({
        path: z.string().min(1, 'Path is required and cannot be empty'),
        startDate: z
          .string()
          .optional()
          .refine(
            date => !date || !isNaN(Date.parse(date)),
            'Invalid start date format',
          ),
        endDate: z
          .string()
          .optional()
          .refine(
            date => !date || !isNaN(Date.parse(date)),
            'Invalid end date format',
          ),
        createdByActiveUser: z.boolean().optional(),
      });

      // Validate & parse request body
      const {path, startDate, endDate, createdByActiveUser} = bodySchema.parse(
        req.body,
      );

      // Validate userId
      if (!Types.ObjectId.isValid(req.user.id)) {
        throw new ValidationError('Invalid user ID');
      }

      // LOGIC
      // Remove override
      await this.rateLimitOverrideService.removeTemporaryOverride(path, {
        userId: createdByActiveUser ? req.user.id : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      // RESPONSE
      res.json({success: true, message: 'Rate limit override removed'});
    } catch (error) {
      logger.error('Error removing rate limit override', {error});
      next(error);
    }
  }
}
