import {Request, Response, NextFunction} from 'express';
import {RateLimitOptions} from '@app/types/rateLimiter';
import {RateLimiter} from '@middlewares/rateLimiter';
import {RateLimitError} from '@utils/errors';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import {RateLimitOverride} from '@models/rateLimitOverride';
import dotenv from 'dotenv';

// Mock dependencies
jest.mock('ioredis');
jest.mock('@configs/redis');
jest.mock('jsonwebtoken');
jest.mock('@models/rateLimitOverride');
jest.mock('@configs/auth', () => ({
  JWT_SECRET: 'test-secret',
  JWT_VERIFY_OPTIONS: {},
}));

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup basic test options
    const options: RateLimitOptions = {
      windowMs: 1000, // 1 second window for easier testing
      maxRequests: 2,
      keyPrefix: 'test:',
    };

    // Setup request mock
    mockRequest = {
      ip: '127.0.0.1',
      path: '/test',
      headers: {},
    };

    // Setup response mock
    mockResponse = {
      setHeader: jest.fn(),
    };

    // Setup next function
    nextFunction = jest.fn();

    // Setup Redis mock
    mockRedis = new Redis() as jest.Mocked<Redis>;
    mockRedis.multi = jest.fn().mockReturnThis();
    mockRedis.zadd = jest.fn().mockReturnThis();
    mockRedis.zremrangebyscore = jest.fn().mockReturnThis();
    mockRedis.expire = jest.fn().mockReturnThis();
    mockRedis.exec = jest.fn().mockResolvedValue([]);
    mockRedis.zcount = jest.fn().mockResolvedValue(0);
    mockRedis.zrange = jest.fn().mockResolvedValue(['1000']);

    rateLimiter = new RateLimiter(options, mockRedis);
  });

  describe('middleware', () => {
    it('should allow requests within rate limit', async () => {
      const rateLimiter = new RateLimiter(
        {
          windowMs: 1000,
          maxRequests: 2,
          keyPrefix: 'test:',
        },
        mockRedis,
      );
      const mockRequest = {
        path: '/test',
        ip: '127.0.0.1',
        headers: {},
      } as Partial<Request>;
      const mockResponse = {
        setHeader: jest.fn(),
      } as Partial<Response>;
      const nextFunction = jest.fn();

      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.exec.mockResolvedValue([[null, 1]]);

      await rateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalledWith(expect.any(Error));
      expect(mockResponse.setHeader).toHaveBeenCalledTimes(3);
      expect(mockRedis.multi().zadd).toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', async () => {
      // Mock Redis to show we've hit the limit
      mockRedis.zcount.mockResolvedValue(2); // Max requests is set up to be 2
      mockRedis.zrange.mockResolvedValue(['1000']);

      await rateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(RateLimitError));
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Retry-After',
        expect.any(Number),
      );
    });

    it('should handle authenticated users differently', async () => {
      // Mock JWT verification
      const mockToken = 'valid-token';
      (jwt.verify as jest.Mock).mockReturnValue({
        userInfo: {id: 'user123'},
      });

      mockRequest.headers = {
        authorization: `Bearer ${mockToken}`,
      };

      await rateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(jwt.verify).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle rate limit overrides', async () => {
      // Mock finding an override
      (RateLimitOverride.findOne as jest.Mock).mockResolvedValue({
        windowMs: 2000,
        maxRequests: 5,
        authenticatedMaxRequests: 10,
      });

      await rateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(RateLimitOverride.findOne).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle invalid JWT tokens gracefully', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await rateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(jwt.verify).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.zcount.mockRejectedValue(new Error('Redis connection error'));

      await rateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should use IP-based rate limiting when no auth token is present', async () => {
      await rateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining(mockRequest.ip!),
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should handle requests with different paths separately', async () => {
      const nonGlobalRateLimiter = new RateLimiter(
        {
          windowMs: 1000,
          maxRequests: 2,
          keyPrefix: 'test:',
        },
        mockRedis,
        false,
      );
      // First request
      await nonGlobalRateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      // Second request with different path
      const newMockRequest = {...mockRequest, path: '/different-path'};
      await nonGlobalRateLimiter.middleware(
        newMockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRedis.zadd).toHaveBeenCalledTimes(2);
      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining('/different-path'),
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should respect custom windowMs from options', async () => {
      const customOptions: RateLimitOptions = {
        windowMs: 5000,
        maxRequests: 2,
        keyPrefix: 'test:',
      };

      const customRateLimiter = new RateLimiter(customOptions, mockRedis);

      await customRateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        'test::ip:127.0.0.1',
        0,
        expect.any(Number),
      );
    });

    it('should handle requests with custom headers', async () => {
      mockRequest.headers = {
        'x-real-ip': '192.168.1.2',
        'x-forwarded-for': '192.168.1.1',
      };

      await rateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.2'),
        expect.any(Number),
        expect.any(String),
      );
    });
  });

  describe('addTemporaryOverride', () => {
    it('should create a temporary rate limit override', async () => {
      const mockOverride = {
        path: '/test',
        windowMs: 1000,
        maxRequests: 5,
        save: jest.fn().mockResolvedValue({id: 'override123'}),
      };

      (RateLimitOverride as unknown as jest.Mock).mockImplementation(
        () => mockOverride,
      );

      const result = await rateLimiter.addTemporaryOverride(
        '/test',
        {windowMs: 1000, maxRequests: 5},
        60000,
        'user123',
      );

      expect(result).toEqual({id: 'override123'});
      expect(mockOverride.save).toHaveBeenCalled();
    });

    it('should reject invalid override parameters', async () => {
      await expect(
        rateLimiter.addTemporaryOverride(
          '/test',
          {windowMs: -1000, maxRequests: -5},
          60000,
          'user123',
        ),
      ).rejects.toThrow();
    });

    it('should handle override with authenticatedMaxRequests', async () => {
      const mockOverride = {
        path: '/test',
        windowMs: 1000,
        maxRequests: 5,
        authenticatedMaxRequests: 10,
        save: jest.fn().mockResolvedValue({id: 'override123'}),
      };

      (RateLimitOverride as unknown as jest.Mock).mockImplementation(
        () => mockOverride,
      );

      const result = await rateLimiter.addTemporaryOverride(
        '/test',
        {
          windowMs: 1000,
          maxRequests: 5,
          authenticatedMaxRequests: 10,
        },
        60000,
        'user123',
      );

      expect(result).toEqual({id: 'override123'});
      expect(mockOverride.save).toHaveBeenCalled();
    });
  });

  describe('getKey for path-based rate limiting (non-global)', () => {
    beforeEach(() => {
      // Initialize with options
      rateLimiter = new RateLimiter(
        {
          windowMs: 1000,
          maxRequests: 2,
          keyPrefix: 'test:',
        },
        mockRedis,
        false,
      );
    });

    it('should generate correct key for authenticated users', () => {
      const mockRequest = {
        path: '/test',
        ip: '127.0.0.1',
        headers: {
          authorization: 'Bearer valid.jwt.token',
        },
      } as Partial<Request>;

      const mockDecodedToken = {
        userInfo: {
          id: 'user123',
        },
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const key = rateLimiter.getKey(mockRequest as Request);
      expect(key).toBe('test::user:user123:/test');
    });

    it('should generate correct key for unauthenticated users', () => {
      const key = rateLimiter.getKey(mockRequest as Request);
      expect(key).toContain(mockRequest.ip);
      expect(key).toContain(mockRequest.path);
    });
  });

  describe('getKey for global rate limiting', () => {
    beforeEach(() => {
      jest.spyOn(dotenv, 'config').mockImplementation(() => {
        process.env.ENABLE_GLOBAL_RATE_LIMIT = 'true';
        return {parsed: {ENABLE_GLOBAL_RATE_LIMIT: 'true'}};
      });
    });

    it('should generate correct key for authenticated users', () => {
      const mockRequest = {
        path: '/test',
        ip: '127.0.0.1',
        headers: {
          authorization: 'Bearer valid.jwt.token',
        },
      } as Partial<Request>;

      const mockDecodedToken = {
        userInfo: {
          id: 'user123',
        },
      } as any;

      jest.spyOn(jwt, 'verify').mockReturnValue(mockDecodedToken);

      const key = rateLimiter.getKey(mockRequest as Request);
      expect(key).toBe('test::user:user123');
    });

    it('should generate correct key for unauthenticated users', () => {
      const mockRequest = {
        path: '/test',
        ip: '127.0.0.1',
        headers: {
          'x-real-ip': '192.168.1.2',
          'x-forwarded-for': '192.168.1.1',
        },
      } as Partial<Request>;

      const mockDecodedToken = {} as any;

      jest.spyOn(jwt, 'verify').mockReturnValue(mockDecodedToken as any);

      const key = rateLimiter.getKey(mockRequest as Request);
      expect(key).toContain('test::ip:192.168.1.2');
    });
  });

  describe('constructor and initialization', () => {
    it('should use default options when none provided', () => {
      const defaultLimiter = new RateLimiter(undefined, mockRedis, false);
      expect((defaultLimiter as any).options).toMatchObject({
        windowMs: expect.any(Number),
        maxRequests: expect.any(Number),
        keyPrefix: expect.any(String),
      });
    });

    it('should override default options with provided options', () => {
      const customOptions = {
        windowMs: 5000,
        maxRequests: 10,
        keyPrefix: 'custom:',
      };
      const limiter = new RateLimiter(customOptions, mockRedis, false);
      expect((limiter as any).options).toMatchObject(customOptions);
    });
  });

  describe('Sliding Log Implementation', () => {
    it('should properly maintain the sliding window', async () => {
      const windowMs = 1000;
      const rateLimiter = new RateLimiter(
        {
          windowMs,
          maxRequests: 2,
          keyPrefix: 'test:',
        },
        mockRedis,
      );

      // Simulate requests at different times
      const now = Date.now();
      mockRedis.zrange.mockResolvedValueOnce([
        `${now - 800}`, // Within window
        `${now - 1200}`, // Outside window
      ]);

      await rateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        expect.stringContaining(mockRequest.ip!),
        0,
        expect.any(Number),
      );
    });

    it('should count only requests within the current window', async () => {
      const windowMs = 1000;
      const rateLimiter = new RateLimiter(
        {
          windowMs,
          maxRequests: 2,
          keyPrefix: 'test:',
        },
        mockRedis,
      );

      const now = Date.now();
      mockRedis.zcount.mockImplementation((key, min, max) => {
        // Verify that the time window parameters are correct
        expect(min).toBe(now - windowMs);
        expect(max).toBe('+inf');
        return Promise.resolve(1);
      });

      jest.spyOn(Date, 'now').mockReturnValue(now);

      await rateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRedis.zcount).toHaveBeenCalledWith(
        expect.stringContaining(mockRequest.ip!),
        expect.any(Number),
        '+inf',
      );
    });
  });

  describe('Global vs Route-Overridden Rate Limits', () => {
    it('should apply global limit when enabled', async () => {
      process.env.ENABLE_GLOBAL_RATE_LIMIT = 'true';
      const rateLimiter = new RateLimiter(
        {
          windowMs: 1000,
          maxRequests: 2,
          keyPrefix: 'test:',
        },
        mockRedis,
        true, // True = Global rate limiting
      );

      await rateLimiter.middleware(
        {...mockRequest, path: '/any/path'} as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        expect.not.stringContaining('/any/path'),
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should override global limit with route-specific limit', async () => {
      const routeOverride = {
        windowMs: 2000,
        maxRequests: 5,
        authenticatedMaxRequests: 10,
      };

      (RateLimitOverride.findOne as jest.Mock).mockResolvedValue(routeOverride);

      await rateLimiter.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Endpoint-Specific vs Route-Override Rate Limits', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter(
        {
          windowMs: 1000,
          maxRequests: 2,
          keyPrefix: 'test:',
        },
        mockRedis,
        false,
      ); // false = per-endpoint rate limiting
    });

    it('should track requests separately for different endpoints', async () => {
      const endpoints = ['/api/users', '/api/posts', '/api/comments'];
      const mockUser = {ip: '127.0.0.1'};

      for (const endpoint of endpoints) {
        mockRedis.zcount.mockResolvedValueOnce(1); // Simulate one existing request

        await rateLimiter.middleware(
          {...mockRequest, path: endpoint, ip: mockUser.ip} as Request,
          mockResponse as Response,
          nextFunction,
        );
      }

      // Verify each endpoint got its own rate limit key
      endpoints.forEach(endpoint => {
        expect(mockRedis.zadd).toHaveBeenCalledWith(
          expect.stringContaining(endpoint),
          expect.any(Number),
          expect.any(String),
        );
      });
    });

    it('should apply route override across all endpoints under that route', async () => {
      // Setup route override for /api/users/*
      const routeOverride = {
        path: '/api/users',
        windowMs: 2000,
        maxRequests: 5,
        authenticatedMaxRequests: 10,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      // Mock findOne to return our override for matching paths
      (RateLimitOverride.findOne as jest.Mock).mockImplementation(query => {
        const path = query.$or[0].path;
        // Return override if path starts with /api/users
        if (path.startsWith('/api/users')) {
          return Promise.resolve(routeOverride);
        }
        return Promise.resolve(null);
      });

      const endpoints = [
        {path: '/api/users/123', shouldMatch: true},
        {path: '/api/users/health', shouldMatch: true},
        {path: '/api/compliments/random', shouldMatch: false},
      ];

      for (const {path, shouldMatch} of endpoints) {
        const req = {...mockRequest, path} as Request;
        await rateLimiter.middleware(
          req,
          mockResponse as Response,
          nextFunction,
        );

        // Verify findOne was called with correct criteria
        expect(RateLimitOverride.findOne).toHaveBeenCalledWith({
          $or: [
            {path},
            {path: {$regex: rateLimiter['convertPathPatternToRegex'](path)}},
          ],
          startsAt: {$lte: expect.any(Date)},
          expiresAt: {$gt: expect.any(Date)},
        });

        // Verify Redis operations were called with correct rate limit values
        if (shouldMatch) {
          expect(mockRedis.zcount).toHaveBeenCalledWith(
            expect.stringContaining(path),
            expect.any(Number),
            '+inf',
          );
          // Add more specific assertions for the override values if needed
        }
      }
    });

    it('should use most specific route override when multiple matches exist', async () => {
      // Setup multiple overlapping route overrides
      const routeOverrides = [
        {
          path: '/api',
          maxRequests: 10,
          authenticatedMaxRequests: 20,
          windowMs: 1000,
        },
        {
          path: '/api/users',
          maxRequests: 5,
          authenticatedMaxRequests: 10,
          windowMs: 2000,
        },
        {
          path: '/api/users/posts',
          maxRequests: 3,
          authenticatedMaxRequests: 6,
          windowMs: 3000,
        },
      ];

      let currentOverrideIndex = 0;
      (RateLimitOverride.find as jest.Mock).mockImplementation(() => ({
        exec: jest
          .fn()
          .mockResolvedValue([routeOverrides[currentOverrideIndex]]),
      }));

      const testCases = [
        {path: '/api/other', expectedMaxRequests: 10},
        {path: '/api/users/profile', expectedMaxRequests: 5},
        {path: '/api/users/posts/1', expectedMaxRequests: 3},
      ];

      for (const testCase of testCases) {
        currentOverrideIndex = routeOverrides.findIndex(override =>
          testCase.path.startsWith(override.path),
        );

        await rateLimiter.middleware(
          {...mockRequest, path: testCase.path} as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockRedis.zcount).toHaveBeenCalledWith(
          expect.stringContaining(testCase.path),
          expect.any(Number),
          '+inf',
        );
      }
    });

    it('should handle nested route overrides with different time windows', async () => {
      const now = Date.now();
      const routeOverrides = [
        {
          path: '/api/users',
          windowMs: 60000, // 1 minute
          maxRequests: 30,
          startsAt: new Date(now - 120000),
          expiresAt: new Date(now + 120000),
        },
        {
          path: '/api/users/posts',
          windowMs: 300000, // 5 minutes
          maxRequests: 50,
          startsAt: new Date(now - 120000),
          expiresAt: new Date(now + 120000),
        },
      ];

      (RateLimitOverride.find as jest.Mock).mockResolvedValue(routeOverrides);

      // Test parent route
      await rateLimiter.middleware(
        {...mockRequest, path: '/api/users/profile'} as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/profile'),
        0,
        expect.any(Number),
      );

      // Test nested route
      await rateLimiter.middleware(
        {...mockRequest, path: '/api/users/posts/1'} as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/posts/1'),
        0,
        expect.any(Number),
      );
    });

    it('should fall back to default limits when no override matches', async () => {
      (RateLimitOverride.find as jest.Mock).mockResolvedValue([]);
      const defaultOptions = {
        windowMs: 1000,
        maxRequests: 2,
      };

      const rateLimiter = new RateLimiter(defaultOptions, mockRedis, false);

      await rateLimiter.middleware(
        {...mockRequest, path: '/api/unmatched/route'} as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRedis.zcount).toHaveBeenCalledWith(
        expect.stringContaining('/api/unmatched/route'),
        expect.any(Number),
        '+inf',
      );
    });

    it('should handle concurrent requests to the same endpoint correctly', async () => {
      const endpoint = '/api/test-concurrent';
      const requests = 5;
      const mockUser = {ip: '127.0.0.1'};

      // Simulate increasing request counts
      let requestCount = 0;
      mockRedis.zcount.mockImplementation(() =>
        Promise.resolve(requestCount++),
      );

      const promises = Array(requests)
        .fill(null)
        .map(() =>
          rateLimiter.middleware(
            {...mockRequest, path: endpoint, ip: mockUser.ip} as Request,
            mockResponse as Response,
            nextFunction,
          ),
        );

      await Promise.all(promises);

      // Verify rate limit was checked for each request
      expect(mockRedis.zcount).toHaveBeenCalledTimes(requests);

      // Verify some requests were blocked after limit was reached
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'RateLimitError',
        }),
      );
    });
  });
});
