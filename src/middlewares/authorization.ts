import {Request, Response, NextFunction} from 'express';
import {UnauthorizedError, ForbiddenError} from '@utils/errors';
import {UserRole} from '@app/types/shared';

export const authorizationMiddleware = (allowedRoles: Array<UserRole>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.roles) {
        throw new UnauthorizedError('User role not found');
      }

      // If role is not in allowedRoles, throw ForbiddenError
      if (!allowedRoles.some(role => req.roles.includes(role))) {
        throw new ForbiddenError(
          'You do not have permission to access this resource',
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
