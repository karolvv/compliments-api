import {Request, Response, NextFunction} from 'express';
import {v4 as uuidv4} from 'uuid';
import logger from '@utils/logger';
import requestLoggerMiddleware from '@middlewares/requestLogger';
import {Socket} from 'node:net';

// Mock dependencies
jest.mock('uuid');
jest.mock('@utils/logger');

describe('Request Logger Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock UUID
    (uuidv4 as jest.Mock).mockReturnValue('test-uuid');

    // Setup request mock
    mockReq = {
      header: jest.fn(),
      headers: {},
      method: 'GET',
      url: '/test',
      socket: {
        remoteAddress: '127.0.0.1',
      } as unknown as Socket,
    };

    // Setup response mock
    mockRes = {
      setHeader: jest.fn(),
      on: jest.fn(),
      get: jest.fn(),
      statusCode: 200,
    };

    nextFunction = jest.fn();
  });

  describe('attachRequestId middleware', () => {
    const [attachRequestId] = requestLoggerMiddleware;

    it('should attach a new UUID when X-Request-ID header is not present', () => {
      attachRequestId(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockReq.requestId).toBe('test-uuid');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        'test-uuid',
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should use existing X-Request-ID from header when present', () => {
      mockReq.header = jest.fn().mockReturnValue('existing-id');

      attachRequestId(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockReq.requestId).toBe('existing-id');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        'existing-id',
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should set startTime', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      attachRequestId(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockReq.startTime).toBe(now);
    });
  });

  describe('logRequest middleware', () => {
    const [_, logRequest] = requestLoggerMiddleware;

    it('should not log health check requests', () => {
      mockReq.url = '/health';
      mockRes.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') callback();
        return mockRes;
      });

      logRequest(mockReq as Request, mockRes as Response, nextFunction);

      expect(logger.http).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should log request details on response finish', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      mockReq.requestId = 'test-id';
      mockReq.startTime = now - 100;
      mockReq.headers = {'user-agent': 'test-agent'};
      mockRes.get = jest.fn().mockReturnValue('123');
      mockRes.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') callback();
        return mockRes;
      });

      logRequest(mockReq as Request, mockRes as Response, nextFunction);

      expect(logger.http).toHaveBeenCalledWith('incoming-request', {
        request_id: 'test-id',
        method: 'GET',
        url: '/test',
        status: 200,
        content_length: '123',
        response_time: 100,
        ip: '127.0.0.1',
        user_agent: 'test-agent',
        time: expect.any(String),
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle missing content-length', () => {
      mockRes.get = jest.fn().mockReturnValue(null);
      mockRes.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') callback();
        return mockRes;
      });

      logRequest(mockReq as Request, mockRes as Response, nextFunction);

      expect(logger.http).toHaveBeenCalledWith(
        'incoming-request',
        expect.objectContaining({
          content_length: '0',
        }),
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle x-forwarded-for header', () => {
      mockReq.headers = {'x-forwarded-for': '10.0.0.1'};
      mockRes.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') callback();
        return mockRes;
      });

      logRequest(mockReq as Request, mockRes as Response, nextFunction);

      expect(logger.http).toHaveBeenCalledWith(
        'incoming-request',
        expect.objectContaining({
          ip: '10.0.0.1',
        }),
      );
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
