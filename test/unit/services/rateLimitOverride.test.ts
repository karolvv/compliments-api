import {RateLimitOverrideService} from '@services/rateLimitOverride';
import {RateLimitOverride} from '@models/rateLimitOverride';
import {TIME_IN_MS} from '@utils/constants';
import {ConflictError} from '@utils/errors';
import {Types} from 'mongoose';
import {RateLimitConfig} from '@app/types/rateLimiter';

jest.mock('@models/rateLimitOverride');

describe('RateLimitOverrideService', () => {
  let service: RateLimitOverrideService;
  const mockPath = '/api/test';
  const mockUserId = new Types.ObjectId().toString();
  const mockConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    maxAuthenticatedRequests: 200,
  } as RateLimitConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RateLimitOverrideService();
  });

  describe('createOverrideWindow', () => {
    it('should create a new override when no overlapping windows exist', async () => {
      const startDate = new Date();
      const durationHours = 2;
      const mockSavedOverride = {
        path: mockPath,
        ...mockConfig,
        startsAt: startDate,
        expiresAt: new Date(
          startDate.getTime() + durationHours * TIME_IN_MS.ONE_HOUR,
        ),
        createdBy: mockUserId,
      };

      jest
        .spyOn(RateLimitOverride.prototype, 'save')
        .mockResolvedValueOnce(mockSavedOverride as any);
      jest.spyOn(RateLimitOverride, 'find').mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce([]),
      } as any);

      const result = await service.createOverrideWindow(
        mockPath,
        mockConfig as RateLimitConfig,
        startDate,
        durationHours,
        mockUserId,
      );

      expect(result).toEqual(mockSavedOverride);
    });

    it('should throw ConflictError when overlapping window exists', async () => {
      const startDate = new Date();
      const durationHours = 2;
      const existingOverride = {
        startsAt: startDate,
        expiresAt: new Date(startDate.getTime() + 3 * TIME_IN_MS.ONE_HOUR),
      };

      jest.spyOn(RateLimitOverride, 'find').mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce([existingOverride]),
      } as any);

      await expect(
        service.createOverrideWindow(
          mockPath,
          mockConfig,
          startDate,
          durationHours,
          mockUserId,
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('removeTemporaryOverride', () => {
    it('should remove overrides for a single path', async () => {
      const mockDeleteResult = {deletedCount: 1};
      jest
        .spyOn(RateLimitOverride, 'deleteMany')
        .mockResolvedValueOnce(mockDeleteResult as any);

      const result = await service.removeTemporaryOverride(mockPath);
      expect(result).toBe(1);
      expect(RateLimitOverride.deleteMany).toHaveBeenCalledWith({
        path: {$in: [mockPath]},
      });
    });

    it('should remove overrides for multiple paths', async () => {
      const paths = ['/api/test1', '/api/test2'];
      const mockDeleteResult = {deletedCount: 2};
      jest
        .spyOn(RateLimitOverride, 'deleteMany')
        .mockResolvedValueOnce(mockDeleteResult as any);

      const result = await service.removeTemporaryOverride(paths);
      expect(result).toBe(2);
      expect(RateLimitOverride.deleteMany).toHaveBeenCalledWith({
        path: {$in: paths},
      });
    });
  });

  describe('getActivePathOverrides', () => {
    it('should return active overrides for a path', async () => {
      const mockOverrides = [{path: mockPath}];
      jest.spyOn(RateLimitOverride, 'find').mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce(mockOverrides),
      } as any);

      const result = await service.getActivePathOverrides(mockPath);
      expect(result).toEqual(mockOverrides);
    });
  });

  describe('getRecentOverrides', () => {
    it('should return recent overrides with correct limit and sort', async () => {
      const mockOverrides = [{path: mockPath}];
      const mockSort = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const mockExec = jest.fn().mockResolvedValueOnce(mockOverrides);

      jest.spyOn(RateLimitOverride, 'find').mockReturnValue({
        sort: mockSort,
        limit: mockLimit,
        exec: mockExec,
      } as any);

      const result = await service.getRecentOverrides(mockPath);

      expect(result).toEqual(mockOverrides);
      expect(mockSort).toHaveBeenCalledWith({createdAt: -1});
      expect(mockLimit).toHaveBeenCalledWith(100);
    });
  });
});
