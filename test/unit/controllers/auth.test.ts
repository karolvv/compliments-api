import {AuthenticationController} from '@controllers/auth';
import {UserDocument} from '@app/types/user';
import {AuthenticationService} from '@services/auth';
import {HTTP_STATUS_CODES} from '@utils/constants';
import {Request, Response, NextFunction} from 'express';

// Mock the authentication service
jest.mock('@services/auth');

describe('AuthenticationController', () => {
  let authController: AuthenticationController;
  let mockAuthService: jest.Mocked<AuthenticationService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks before each test
    mockAuthService =
      new AuthenticationService() as jest.Mocked<AuthenticationService>;
    authController = new AuthenticationController(mockAuthService);

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockLoginResult = {
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
          username: 'test.user',
          password: 'password123',
        } as unknown as UserDocument,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      mockRequest = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        accessToken: 'mock-access-token',
      });
    });

    it('should handle invalid email format', async () => {
      mockRequest = {
        body: {
          email: 'invalid-email',
          password: 'password123',
        },
      };

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should handle service errors during login', async () => {
      const errorMessage = 'Invalid credentials';
      mockAuthService.login.mockRejectedValue(new Error(errorMessage));
      mockRequest = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should handle missing request body', async () => {
      mockRequest = {body: {}};

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockRegisterResult = {
        user: {
          id: 'mock-user-id',
          email: 'new@example.com',
          username: 'new.user',
          password: 'password123',
        } as unknown as UserDocument,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockAuthService.register.mockResolvedValue(mockRegisterResult);

      mockRequest = {
        body: {
          email: 'new@example.com',
          password: 'password123',
          username: 'new.user',
        },
      };

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(
        'new@example.com',
        'new.user',
        'password123',
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-refresh-token',
        expect.any(Object),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(
        HTTP_STATUS_CODES.CREATED,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
      });
    });

    it('should handle duplicate email registration', async () => {
      mockAuthService.register.mockRejectedValue(
        new Error('Email already exists'),
      );
      mockRequest = {
        body: {
          email: 'existing@example.com',
          password: 'password123',
          username: 'existing.user',
        },
      };

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('refresh', () => {
    it('should successfully refresh tokens', async () => {
      const mockRefreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockAuthService.refresh.mockResolvedValue(mockRefreshResult);

      mockRequest = {
        cookies: {
          refreshToken: 'old-refresh-token',
        },
      };

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockAuthService.refresh).toHaveBeenCalledWith('old-refresh-token');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-refresh-token',
        expect.any(Object),
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
      });
    });

    it('should handle missing refresh token', async () => {
      mockRequest = {cookies: {}};

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockAuthService.refresh).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      mockRequest = {
        cookies: {
          refreshToken: 'existing-refresh-token',
        },
      };

      await authController.logout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'existing-refresh-token',
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        path: '/api/auth',
        sameSite: 'strict',
        secure: false,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(
        HTTP_STATUS_CODES.NO_CONTENT,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });

    it('should handle logout without refresh token', async () => {
      mockRequest = {cookies: {}};

      await authController.logout(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        path: '/api/auth',
        sameSite: 'strict',
        secure: false,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(
        HTTP_STATUS_CODES.NO_CONTENT,
      );
    });
  });
});
