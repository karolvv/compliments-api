import {Request, Response, NextFunction} from 'express';
import {ZodError, z} from 'zod';
import errorHandlingMiddleware from '@middlewares/errorHandling';
import {ValidationError, NotFoundError, RateLimitError} from '@utils/errors';
import logger from '@utils/logger';
import {HTTP_STATUS_CODES} from '@utils/constants';

// Mock logger to prevent actual logging during tests
jest.mock('@utils/logger', () => ({
  error: jest.fn(),
}));

describe('errorHandlingMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test',
      requestId: 'test-id',
      query: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      headersSent: false,
    };

    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should pass error to next if headers are already sent', () => {
    const error = new Error('Test error');
    mockResponse.headersSent = true;

    errorHandlingMiddleware(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalledWith(error);
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should handle ValidationError with details', () => {
    const validationError = new ValidationError('Validation failed', {
      field: ['Invalid field'],
    });

    errorHandlingMiddleware(
      validationError,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(
      validationError.statusCode,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: validationError.message,
      code: validationError.statusCode,
      errorCode: validationError.code,
      validationErrors: validationError.details,
    });
  });

  it('should handle NotFoundError with resource', () => {
    const notFoundError = new NotFoundError('User');

    errorHandlingMiddleware(
      notFoundError,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(notFoundError.statusCode);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: notFoundError.message,
      code: notFoundError.statusCode,
      errorCode: notFoundError.code,
      resource: notFoundError.resource,
    });
  });

  it('should handle RateLimitError with retryAfter', () => {
    const rateLimitError = new RateLimitError('Too many requests', 60);

    errorHandlingMiddleware(
      rateLimitError,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(rateLimitError.statusCode);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: rateLimitError.message,
      code: rateLimitError.statusCode,
      errorCode: rateLimitError.code,
      retryAfter: rateLimitError.retryAfter,
    });
  });

  it('should handle ZodError', () => {
    const schema = z.object({name: z.string()});
    let zodError: ZodError;
    try {
      schema.parse({name: 123});
    } catch (error) {
      zodError = error as ZodError;

      errorHandlingMiddleware(
        zodError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        code: 400,
        errorCode: 'ERR_VALIDATION',
        validationErrors: zodError,
      });
    }
  });

  it('should handle generic Error in production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const error = new Error('Something went wrong');

    errorHandlingMiddleware(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'An unexpected error occurred',
      code: 500,
      errorCode: 'ERR_INTERNAL',
    });

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should handle generic Error in development', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const error = new Error('Something went wrong');

    errorHandlingMiddleware(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: 'error',
      message: error.message,
      code: 500,
      errorCode: 'ERR_INTERNAL',
    });

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should log error details', () => {
    const error = new Error('Test error');
    error.cause = new Error('Cause error');

    errorHandlingMiddleware(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Error occurred during request processing',
      expect.objectContaining({
        error: expect.objectContaining({
          message: error.message,
          name: error.constructor.name,
          cause: {
            message: 'Cause error',
            name: 'Error',
          },
        }),
        request: expect.objectContaining({
          method: mockRequest.method,
          path: mockRequest.path,
          requestId: mockRequest.requestId,
        }),
      }),
    );
  });
});
