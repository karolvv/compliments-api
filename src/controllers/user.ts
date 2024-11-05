import {NextFunction, Request, Response} from 'express';
import {UserService} from '@services/user';
import {Types} from 'mongoose';
import {ConflictError, ValidationError} from '@utils/errors';
import z from 'zod';

export class UserController {
  private readonly userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  public getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // VALIDATION
      // Validate the User ID
      if (!Types.ObjectId.isValid(req.params.id)) {
        throw new ValidationError('Invalid user ID');
      }

      // LOGIC
      // Get the user by ID
      const user = await this.userService.getUserById(req.params.id);

      // RESPONSE
      res.json(user);
    } catch (error) {
      next(error);
    }
  };

  getUserByUsername = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // VALIDATION
      // Validate the Username
      const querySchema = z.object({
        username: z
          .string()
          .min(1, 'Username must not be empty')
          .max(255, 'Username must not exceed 255 characters')
          .transform(
            text => text.replace(/<[^>]*>.*?<\/[^>]*>/g, ''), // Removes HTML tags and everything in between them
          ),
      });
      const {username} = querySchema.parse(req.params);

      // LOGIC
      // Get the user by Username
      const user = await this.userService.getUserByUsername(username);

      // RESPONSE
      res.json(user);
    } catch (error) {
      next(error);
    }
  };

  getUsers = async (req: Request, res: Response, next: NextFunction) => {
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
      const result = await this.userService.getUsers({page, limit});

      // RESPONSE
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // VALIDATION
      if (!req.params.id) {
        throw new ValidationError('User ID is required');
      }
      const existingUser = await this.userService.getUserById(req.params.id);
      if (!existingUser) {
        throw new ConflictError('User with this ID does not exist');
      }

      // LOGIC
      const updatedUser = await this.userService.updateUser(
        req.params.id,
        req.body,
      );

      // RESPONSE
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // LOGIC
      await this.userService.deleteUser(req.params.id);

      // RESPONSE
      res.json({message: 'User deleted successfully'});
    } catch (error) {
      next(error);
    }
  };
}
