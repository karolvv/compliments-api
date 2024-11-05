import {
  RateLimitOverrideDocument,
  RateLimitConfig,
} from '@app/types/rateLimiter';
import {TIME_IN_MS} from '@utils/constants';
import {ConflictError} from '@utils/errors';
import {RateLimitOverride} from '@models/rateLimitOverride';
import {FilterQuery} from 'mongoose';

export class RateLimitOverrideService {
  /**
   * Get all overrides. If path is provided, get overrides for that path.
   */
  private async getOverrides(
    path?: string,
  ): Promise<RateLimitOverrideDocument[]> {
    return this.getFilteredOverrides({path});
  }

  /**
   * Check if there's any overlap with existing overrides
   */
  private async hasOverlappingOverride(
    path: string,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    const existingOverrides = await this.getOverrides(path);

    return existingOverrides.some(({startsAt, expiresAt}) => {
      const overrideStart = new Date(startsAt);
      const overrideEnd = new Date(expiresAt);

      const overlaps = startDate <= overrideEnd && endDate >= overrideStart;

      return overlaps;
    });
  }

  /**
   * Get overrides with optional filters
   */
  private async getFilteredOverrides(filters?: {
    path?: string;
    betweenDates?: [Date, Date];
    startsAfter?: Date;
    expiresAfter?: Date;
    limit?: number;
    sortBy?: string;
  }): Promise<RateLimitOverrideDocument[]> {
    const {path, betweenDates, startsAfter, expiresAfter, limit, sortBy} =
      filters || {};
    const query: FilterQuery<RateLimitOverrideDocument> = {};

    if (path) {
      query.path = path;
    }

    if (betweenDates) {
      query.$and = [
        {startsAt: {$lte: betweenDates[1]}}, // Override starts before query window ends
        {expiresAt: {$gte: betweenDates[0]}}, // Override ends after query window starts
      ];
    }

    if (startsAfter) {
      query.startsAt = {$gte: startsAfter};
    }

    if (expiresAfter) {
      query.expiresAt = {$gt: expiresAfter};
    }

    let findQuery = RateLimitOverride.find(query);

    if (sortBy) {
      findQuery = findQuery.sort({[sortBy]: -1});
    }
    if (limit) {
      findQuery = findQuery.limit(limit);
    }

    return findQuery.exec();
  }

  private async addTemporaryOverrideByStartDateAndDuration(
    path: string,
    config: RateLimitConfig,
    startDate: Date,
    durationMs: number,
    userId?: string,
  ): Promise<RateLimitOverrideDocument> {
    const override = new RateLimitOverride({
      path,
      ...config,
      startsAt: startDate,
      expiresAt: new Date(startDate.getTime() + durationMs),
      createdBy: userId,
    });

    const savedOverride = await override.save();

    return savedOverride;
  }

  /**
   * Base method for creating overrides
   */
  public async createOverrideWindow(
    path: string,
    config: RateLimitConfig,
    startDate: Date,
    durationHours: number,
    userId: string,
  ): Promise<RateLimitOverrideDocument> {
    const endDate = new Date(
      startDate.getTime() + durationHours * TIME_IN_MS.ONE_HOUR,
    );

    if (await this.hasOverlappingOverride(path, startDate, endDate)) {
      throw new ConflictError(
        'Time window overlaps with existing rate limit override',
      );
    }

    return this.addTemporaryOverrideByStartDateAndDuration(
      path,
      config,
      startDate,
      durationHours * TIME_IN_MS.ONE_HOUR,
      userId,
    );
  }

  /**
   * Removes temporary rate limit override(s) for specified path(s)
   * @param path - String or array of paths to remove overrides for
   * @param options - Optional parameters for removal (e.g., specific date ranges)
   * @returns Promise<number> - Number of overrides removed
   */
  public async removeTemporaryOverride(
    path: string | string[],
    options?: {
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<number> {
    const paths = Array.isArray(path) ? path : [path];
    const query: FilterQuery<RateLimitOverrideDocument> = {
      path: {$in: paths},
    };

    if (options?.userId) {
      query.createdBy = options.userId;
    }

    // If date range is provided, find overlapping overrides
    if (options?.startDate && options?.endDate) {
      const overlappingOverridesPromises = paths.map(async p => {
        const hasOverlap = await this.hasOverlappingOverride(
          p,
          options.startDate!,
          options.endDate!,
        );
        return hasOverlap ? p : null;
      });

      const pathsWithOverlaps = (
        await Promise.all(overlappingOverridesPromises)
      ).filter((p): p is string => p !== null);

      if (pathsWithOverlaps.length > 0) {
        query.path = {$in: pathsWithOverlaps};
      } else {
        return 0; // No overlapping overrides found
      }
    }

    const result = await RateLimitOverride.deleteMany(query);
    return result.deletedCount;
  }

  public async getRecentOverrides(
    path?: string,
  ): Promise<RateLimitOverrideDocument[]> {
    return this.getFilteredOverrides({
      path,
      limit: 100,
      sortBy: 'createdAt',
    });
  }

  public async getActivePathOverrides(
    path?: string,
  ): Promise<RateLimitOverrideDocument[]> {
    const now = new Date();

    return this.getFilteredOverrides({
      path,
      betweenDates: [now, now],
    });
  }
}
