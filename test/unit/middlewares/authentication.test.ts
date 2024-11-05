import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {authenticationMiddleware} from '@middlewares/authentication';
import {UnauthorizedError} from '@utils/errors';
import {JWT_SECRET} from '@configs/auth';

// Mock dependencies
jest.mock('@utils/logger');
jest.mock('@configs/auth', () => ({
  JWT_SECRET: 'test-secret',
  JWT_VERIFY_OPTIONS: {},
  publicPaths: ['/public-path'],
}));

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {
      headers: {},
      path: '/protected-path',
    };
    mockRes = {};
    mockNext = jest.fn();
  });
  it('should allow access to public paths without token', async () => {
    Object.defineProperty(mockReq, 'path', {value: '/public-path'});

    await authenticationMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should throw UnauthorizedError when no authorization header is present', async () => {
    await authenticationMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should throw UnauthorizedError when authorization header is malformed', async () => {
    mockReq.headers = {authorization: 'Invalid Token'};

    await authenticationMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should set user and roles when valid token is provided', async () => {
    const mockUserInfo = {
      id: '123',
      email: 'test@example.com',
      roles: ['USER'],
    };

    const token = jwt.sign({userInfo: mockUserInfo}, JWT_SECRET);
    mockReq.headers = {authorization: `Bearer ${token}`};

    await authenticationMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext,
    );

    expect(mockReq.user).toEqual(mockUserInfo);
    expect(mockReq.roles).toEqual(mockUserInfo.roles);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should throw UnauthorizedError when token is expired', async () => {
    const mockUserInfo = {
      id: '123',
      email: 'test@example.com',
      roles: ['USER'],
    };

    const token = jwt.sign({userInfo: mockUserInfo}, JWT_SECRET, {
      expiresIn: '0s',
    });
    mockReq.headers = {authorization: `Bearer ${token}`};

    // Wait for token to expire
    await new Promise(resolve => setTimeout(resolve, 1000));

    await authenticationMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should throw UnauthorizedError when token is invalid', async () => {
    mockReq.headers = {authorization: 'Bearer invalid.token.here'};

    await authenticationMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
