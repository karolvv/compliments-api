import {ComplimentService} from '@services/compliment';
import {Request, Response, NextFunction} from 'express';
import {Types} from 'mongoose';
import {ForbiddenError, ValidationError} from '@utils/errors';
import {z} from 'zod';
import {HTTP_STATUS_CODES, USER_ROLES} from '@utils/constants';

export class ComplimentController {
  private complimentService: ComplimentService;

  constructor(complimentService: ComplimentService) {
    this.complimentService = complimentService;
  }

  public getRandomCompliment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // LOGIC
      // Get a random compliment
      const randomCompliment =
        await this.complimentService.getRandomCompliment();

      // RESPONSE
      res.json(randomCompliment);
    } catch (error) {
      next(error);
    }
  };

  public getComplimentById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // VALIDATION
      // Validate the Compliment ID
      if (!Types.ObjectId.isValid(req.params.id)) {
        throw new ValidationError('Invalid compliment ID');
      }

      // LOGIC
      // Get the compliment by ID
      const compliment = await this.complimentService.getComplimentById(
        req.params.id,
      );

      // RESPONSE
      res.json(compliment);
    } catch (error) {
      next(error);
    }
  };

  public getCompliments = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // VALIDATION
      // Validate the Query Parameters page and limit
      const querySchema = z.object({
        page: z
          .string()
          .regex(/^\d+$/)
          .optional()
          .default('1')
          .transform(val => parseInt(val))
          .refine(val => val > 0, 'Page must be a positive number'),
        limit: z
          .string()
          .regex(/^\d+$/)
          .optional()
          .default('10')
          .transform(val => parseInt(val))
          .refine(
            val => val > 0 && val <= 30,
            'Limit must be a number between 1 and 30',
          ),
      });

      const {page, limit} = querySchema.parse(req.query);

      // LOGIC
      // Get the paginated response
      const paginatedResponse = await this.complimentService.getCompliments({
        page,
        limit,
      });

      // RESPONSE
      res.json(paginatedResponse);
    } catch (error) {
      next(error);
    }
  };

  public createCompliment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // VALIDATION
      // Validate the User ID
      if (!Types.ObjectId.isValid(req.user.id)) {
        throw new ValidationError('Invalid user ID');
      }

      // Validate and sanitize the Compliment Text
      const complimentSchema = z.object({
        text: z
          .string()
          .min(1)
          .max(500)
          .transform(
            text => text.replace(/<[^>]*>.*?<\/[^>]*>/g, ''), // Removes HTML tags and everything in between them
          ),
      });
      const {text} = complimentSchema.parse(req.body);

      // LOGIC
      // Create the compliment
      const savedCompliment = await this.complimentService.createCompliment({
        text,
        authorId: req.user.id,
      });

      // RESPONSE
      res.status(HTTP_STATUS_CODES.CREATED).json(savedCompliment);
    } catch (error) {
      next(error);
    }
  };

  public updateCompliment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // VALIDATION
      // Validate the Compliment ID
      if (!Types.ObjectId.isValid(req.params.id)) {
        throw new ValidationError('Invalid compliment ID');
      }

      // Validate the Compliment Text
      const complimentSchema = z.object({
        text: z.string().min(1),
      });
      const {text} = complimentSchema.parse(req.body);

      // LOGIC
      // Update the compliment
      const updatedCompliment = await this.complimentService.updateCompliment(
        req.params.id,
        {text},
        req.body?.authorId,
      );

      // RESPONSE
      res.json(updatedCompliment);
    } catch (error) {
      next(error);
    }
  };

  public deleteCompliment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // VALIDATION
      // Validate the User ID
      if (!Types.ObjectId.isValid(req.user.id)) {
        throw new ValidationError('Invalid user ID');
      }

      // Validate the Compliment ID
      if (!Types.ObjectId.isValid(req.params.id)) {
        throw new ValidationError('Invalid compliment ID');
      }

      // LOGIC
      // Check if the the user is the author of the compliment
      const compliment = await this.complimentService.getComplimentById(
        req.params.id,
      );

      if (
        compliment?.authorId?.toString() !== req.user.id &&
        !req.user.roles.includes(USER_ROLES.ADMIN)
      ) {
        throw new ForbiddenError(
          'You are not authorized to delete this compliment',
        );
      }

      // Delete the compliment
      await this.complimentService.deleteCompliment(req.params.id);

      // RESPONSE
      res.json({message: 'Compliment deleted successfully'});
    } catch (error) {
      next(error);
    }
  };
}
