import {Request, Response, NextFunction} from 'express';
import {authorizationMiddleware} from '@middlewares/authorization';
import {UnauthorizedError, ForbiddenError} from '@utils/errors';
import {USER_ROLES} from '@utils/constants';

describe('Authorization Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {};
    nextFunction = jest.fn();
  });

  it('should call next() when user has required role', () => {
    mockRequest.user = {
      id: '1',
      email: 'user@example.com',
      roles: [USER_ROLES.ADMIN],
    };
    mockRequest.roles = [USER_ROLES.ADMIN];

    const middleware = authorizationMiddleware([USER_ROLES.ADMIN]);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it('should throw UnauthorizedError when user or roles are not present', () => {
    const middleware = authorizationMiddleware([USER_ROLES.ADMIN]);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect((nextFunction as jest.Mock).mock.calls[0][0].message).toBe(
      'Unauthorized access: User role not found',
    );
  });

  it('should throw ForbiddenError when user does not have required role', () => {
    mockRequest.user = {id: '1', email: '', roles: []};
    mockRequest.roles = [USER_ROLES.USER];

    const middleware = authorizationMiddleware([USER_ROLES.ADMIN]);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
    expect((nextFunction as jest.Mock).mock.calls[0][0].message).toBe(
      'Forbidden access: You do not have permission to access this resource',
    );
  });

  it('should allow access when user has one of multiple allowed roles', () => {
    mockRequest.user = {
      id: '1',
      email: 'user@example.com',
      roles: [USER_ROLES.USER],
    };
    mockRequest.roles = [USER_ROLES.USER];

    const middleware = authorizationMiddleware([
      USER_ROLES.ADMIN,
      USER_ROLES.USER,
    ]);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });
});
