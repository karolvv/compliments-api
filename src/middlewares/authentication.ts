import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {JWT_SECRET, JWT_VERIFY_OPTIONS} from '@configs/auth';
import {UnauthorizedError} from '@utils/errors';
import logger from '@utils/logger';
import {publicPaths} from '@configs/auth';
import type {
  UserInfoTokenContext,
  TokenContext,
  UserRole,
} from '@app/types/shared';

declare module 'express-serve-static-core' {
  interface Request {
    user: UserInfoTokenContext;
    roles: UserRole[];
  }
}

export const authenticationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (publicPaths.includes(req.path)) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedError('Authentication required: No token provided');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedError(
        'Invalid authentication format: Expected Bearer token',
      );
    }

    logger.debug('Received token details:', {
      completeToken: token,
      parts: {
        header: token.split('.')[0],
        payload: token.split('.')[1],
        signature: token.split('.')[2],
      },
    });

    try {
      const decoded = jwt.verify(
        token,
        JWT_SECRET,
        JWT_VERIFY_OPTIONS,
      ) as TokenContext;
      logger.debug('Successfully verified token:', {
        decodedPayload: decoded,
      });
      req.user = decoded.userInfo;
      req.roles = decoded.userInfo.roles;
      next();
    } catch (error) {
      // Handle specific JWT errors
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      } else if (error instanceof jwt.NotBeforeError) {
        throw new UnauthorizedError('Token not yet active');
      }

      logger.error('Token verification failed:', {
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
          stack: (error as Error).stack,
        },
        receivedToken: token,
        tokenParts: token.split('.'),
      });

      // If it's not a known JWT error, throw a generic unauthorized error
      throw new UnauthorizedError('Authentication failed');
    }
  } catch (error) {
    // Ensure we're always passing an Error object to the error handler
    if (error instanceof Error) {
      next(error);
    } else {
      next(new UnauthorizedError('Unknown authentication error'));
    }
  }
};
