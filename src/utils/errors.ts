/**
 * @openapi
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         statusCode:
 *           type: integer
 *         code:
 *           type: string
 *
 *     ValidationError:
 *       allOf:
 *         - $ref: '#/components/schemas/Error'
 *         - type: object
 *           properties:
 *             details:
 *               type: object
 *               additionalProperties:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: string
 *                   - type: string
 *
 *     NotFoundError:
 *       allOf:
 *         - $ref: '#/components/schemas/Error'
 *         - type: object
 *           properties:
 *             resource:
 *               type: string
 *             code:
 *               type: string
 *               example: 'ERR_NOT_FOUND'
 *
 *     RateLimitError:
 *       allOf:
 *         - $ref: '#/components/schemas/Error'
 *         - type: object
 *           properties:
 *             retryAfter:
 *               type: integer
 *               description: Number of seconds to wait before retrying
 *             code:
 *               type: string
 *               example: 'ERR_RATE_LIMIT'
 *
 *     DatabaseError:
 *       allOf:
 *         - $ref: '#/components/schemas/Error'
 *         - type: object
 *           properties:
 *             code:
 *               type: string
 *               example: 'ERR_DATABASE'
 *
 *     UnauthorizedError:
 *       allOf:
 *         - $ref: '#/components/schemas/Error'
 *         - type: object
 *           properties:
 *             code:
 *               type: string
 *               example: 'ERR_UNAUTHORIZED'
 *
 *     ForbiddenError:
 *       allOf:
 *         - $ref: '#/components/schemas/Error'
 *         - type: object
 *           properties:
 *             code:
 *               type: string
 *               example: 'ERR_FORBIDDEN'
 *
 *     BadRequestError:
 *       allOf:
 *         - $ref: '#/components/schemas/Error'
 *         - type: object
 *           properties:
 *             code:
 *               type: string
 *               example: 'ERR_BAD_REQUEST'
 *
 *     ServerError:
 *       allOf:
 *         - $ref: '#/components/schemas/Error'
 *         - type: object
 *           properties:
 *             code:
 *               type: string
 *               example: 'ERR_SERVER'
 *
 *     ConflictError:
 *       allOf:
 *         - $ref: '#/components/schemas/Error'
 *         - type: object
 *           properties:
 *             code:
 *               type: string
 *               example: 'ERR_CONFLICT'
 */

import {
  ICustomError,
  INotFoundError,
  IValidationError,
  IRateLimitError,
} from '@app/types/errors';
import {ZodError} from 'zod';
import {HTTP_STATUS_CODES} from './constants';

class CustomError extends Error implements ICustomError {
  statusCode: number;
  code?: string;
  cause?: Error;

  constructor(message: string, statusCode: number, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends CustomError implements INotFoundError {
  resource: string;
  code = 'ERR_NOT_FOUND';

  constructor(resource: string, cause?: Error) {
    super(`${resource} not found`, HTTP_STATUS_CODES.NOT_FOUND, cause);
    this.resource = resource;
  }
}

export class ValidationError extends CustomError implements IValidationError {
  code = 'ERR_VALIDATION';
  details?: Record<string, string[] | string> | ZodError;

  constructor(
    message: string,
    details?: Record<string, string[] | string> | ZodError,
    cause?: Error,
  ) {
    super(`Validation Error: ${message}`, HTTP_STATUS_CODES.BAD_REQUEST, cause);
    this.details = details;
  }
}

export class DatabaseError extends CustomError {
  code = 'ERR_DATABASE';
  constructor(message: string, cause?: Error) {
    super(
      `Database Error: ${message}`,
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
      cause,
    );
  }
}

export class UnauthorizedError extends CustomError {
  code = 'ERR_UNAUTHORIZED';
  constructor(message: string, cause?: Error) {
    super(
      `Unauthorized access: ${message}`,
      HTTP_STATUS_CODES.UNAUTHORIZED,
      cause,
    );
  }
}

export class ForbiddenError extends CustomError {
  code = 'ERR_FORBIDDEN';
  constructor(message: string, cause?: Error) {
    super(`Forbidden access: ${message}`, HTTP_STATUS_CODES.FORBIDDEN, cause);
  }
}

export class BadRequestError extends CustomError {
  code = 'ERR_BAD_REQUEST';
  constructor(message: string, cause?: Error) {
    super(`Bad Request: ${message}`, HTTP_STATUS_CODES.BAD_REQUEST, cause);
  }
}

export class ServerError extends CustomError {
  code = 'ERR_SERVER';
  constructor(message: string, cause?: Error) {
    super(
      `Server Error: ${message}`,
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
      cause,
    );
  }
}

export class ConflictError extends CustomError {
  code = 'ERR_CONFLICT';
  constructor(message: string, cause?: Error) {
    super(`Conflict: ${message}`, HTTP_STATUS_CODES.CONFLICT, cause);
  }
}

export class RateLimitError extends CustomError implements IRateLimitError {
  code = 'ERR_RATE_LIMIT';
  retryAfter: number;

  constructor(message: string, retryAfter: number, cause?: Error) {
    super(
      `Rate limit exceeded: ${message}`,
      HTTP_STATUS_CODES.TOO_MANY_REQUESTS,
      cause,
    );
    this.retryAfter = retryAfter;
  }
}

// Utility and helper functions

// Checks if the error is a CustomError
export const isCustomError = (error: unknown): error is CustomError => {
  return error instanceof CustomError;
};

// Checks if the error is a NotFoundError
export const isNotFoundError = (error: unknown): error is NotFoundError => {
  return error instanceof NotFoundError;
};

// Checks if the error has a cause and adds it if it doesn't
export const withCause = <T extends CustomError>(error: T, cause: Error): T => {
  error.cause = cause;
  return error;
};
