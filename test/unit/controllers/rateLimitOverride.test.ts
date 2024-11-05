import {RateLimitOverrideController} from '@controllers/rateLimitOverride';
import {RateLimitOverrideService} from '@services/rateLimitOverride';
import {ValidationError} from '@utils/errors';
import {TIME_IN_MS, USER_ROLES} from '@utils/constants';
import {Request, Response} from 'express';
import {Types} from 'mongoose';
import {RateLimitOverrideDocument} from '@app/types/rateLimiter';

// Mock dependencies
jest.mock('@services/rateLimitOverride');
jest.mock('@utils/logger');

describe('RateLimitOverrideController', () => {
  let controller: RateLimitOverrideController;
  let mockService: jest.Mocked<RateLimitOverrideService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockService = {
      getRecentOverrides: jest.fn(),
      getActivePathOverrides: jest.fn(),
      createOverrideWindow: jest.fn(),
      removeTemporaryOverride: jest.fn(),
    } as unknown as jest.Mocked<RateLimitOverrideService>;

    controller = new RateLimitOverrideController(mockService);

    mockRes = {
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('getRecentOverrides', () => {
    it('should return overrides successfully', async () => {
      const mockOverrides = [
        {id: 1},
        {id: 2},
      ] as unknown as RateLimitOverrideDocument[];
      mockService.getRecentOverrides.mockResolvedValue(mockOverrides);
      mockReq = {
        query: {path: '/api/test'},
      };

      await controller.getRecentOverrides(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockService.getRecentOverrides).toHaveBeenCalledWith('/api/test');
      expect(mockRes.json).toHaveBeenCalledWith(mockOverrides);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      mockService.getRecentOverrides.mockRejectedValue(error);
      mockReq = {
        query: {path: '/api/test'},
      };

      await controller.getRecentOverrides(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getActivePathOverrides', () => {
    it('should return active overrides successfully', async () => {
      const mockOverrides = [
        {id: 1},
        {id: 2},
      ] as unknown as RateLimitOverrideDocument[];
      mockService.getActivePathOverrides.mockResolvedValue(mockOverrides);
      mockReq = {
        query: {path: '/api/test'},
      };

      await controller.getActivePathOverrides(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockService.getActivePathOverrides).toHaveBeenCalledWith(
        '/api/test',
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockOverrides);
    });
  });

  describe('createOverride', () => {
    it('should create override successfully', async () => {
      const mockReqBody = {
        path: '/api/test',
        maxRequests: 100,
        authenticatedMaxRequests: 200,
        startDate: '2024-03-20T00:00:00Z',
        durationHours: 24,
      };

      mockReq = {
        body: mockReqBody,
        user: {
          id: new Types.ObjectId().toString(),
          email: 'test@example.com',
          roles: [USER_ROLES.USER],
        },
      };

      await controller.createOverride(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockService.createOverrideWindow).toHaveBeenCalledWith(
        mockReqBody.path,
        {
          windowMs: mockReqBody.durationHours * TIME_IN_MS.ONE_HOUR,
          maxRequests: mockReqBody.maxRequests,
          authenticatedMaxRequests: mockReqBody.authenticatedMaxRequests,
        },
        new Date(mockReqBody.startDate),
        mockReqBody.durationHours,
        mockReq?.user?.id,
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Rate limit override configured',
      });
    });

    it('should validate request body', async () => {
      mockReq = {
        body: {
          path: '',
          maxRequests: -1,
          startDate: 'invalid-date',
        },
        user: {
          id: new Types.ObjectId().toString(),
          email: 'test@example.com',
          roles: [USER_ROLES.USER],
        },
      };

      await controller.createOverride(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockService.createOverrideWindow).not.toHaveBeenCalled();
    });
  });

  describe('removeOverride', () => {
    it('should remove override successfully', async () => {
      const mockReqBody = {
        path: '/api/test',
        startDate: '2024-03-20T00:00:00Z',
        endDate: '2024-03-21T00:00:00Z',
        createdByActiveUser: true,
      };

      mockReq = {
        body: mockReqBody,
        user: {
          id: new Types.ObjectId().toString(),
          email: 'test@example.com',
          roles: [USER_ROLES.USER],
        },
      };

      await controller.removeOverride(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockService.removeTemporaryOverride).toHaveBeenCalledWith(
        mockReqBody.path,
        {
          userId: mockReq?.user?.id,
          startDate: new Date(mockReqBody.startDate),
          endDate: new Date(mockReqBody.endDate),
        },
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Rate limit override removed',
      });
    });

    it('should handle invalid user ID', async () => {
      mockReq = {
        body: {path: '/api/test'},
        user: {
          id: 'invalid-id',
          email: 'test@example.com',
          roles: [USER_ROLES.USER],
        },
      };

      await controller.removeOverride(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockService.removeTemporaryOverride).not.toHaveBeenCalled();
    });
  });
});
