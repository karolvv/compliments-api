import {Request, Response, NextFunction} from 'express';
import {
  ValidationError,
  isCustomError,
  NotFoundError,
  RateLimitError,
} from '@utils/errors';
import {ICustomError, IErrorResponse} from '@app/types/errors';
import logger from '@utils/logger';
import {ZodError} from 'zod';
import {HTTP_STATUS_CODES} from '@utils/constants';

const errorHandlingMiddleware = (
  err: Error | ICustomError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  logger.error('Error occurred during request processing', {
    error: {
      message: err.message,
      name: err.constructor.name,
      code: isCustomError(err) ? err.code : undefined,
      cause:
        err.cause && err.cause instanceof Error
          ? {
              message: err.cause.message,
              name: err.cause.constructor.name,
            }
          : undefined,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    },
    request: {
      method: req.method,
      path: req.path,
      requestId: req.requestId,
      query: req.query,
      body: process.env.NODE_ENV !== 'production' ? req.body : undefined,
    },
  });

  if (isCustomError(err)) {
    const response: IErrorResponse = {
      status: 'error',
      message: err.message,
      code: err.statusCode,
      errorCode: err.code,
    };

    if (err instanceof ValidationError && err.details) {
      response.validationErrors = err.details;
    }

    if (err instanceof NotFoundError) {
      response.resource = err.resource;
    }

    if (err instanceof RateLimitError) {
      response.retryAfter = err.retryAfter;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  if (err instanceof ZodError) {
    const response: IErrorResponse = {
      status: 'error',
      message: 'Validation failed',
      code: HTTP_STATUS_CODES.BAD_REQUEST,
      errorCode: 'ERR_VALIDATION',
      validationErrors: err,
    };
    res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(response);
    return;
  }

  const response: IErrorResponse = {
    status: 'error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    code: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    errorCode: 'ERR_INTERNAL',
  };

  res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json(response);
};

export default errorHandlingMiddleware;
