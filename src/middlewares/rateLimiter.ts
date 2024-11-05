import {JWT_SECRET, JWT_VERIFY_OPTIONS} from '@configs/auth';
import {rateLimiterConfig} from '@configs/rateLimiter';
import {RateLimitError, ValidationError} from '@utils/errors';
import {RateLimitOptions, RateLimitConfig} from '@app/types/rateLimiter';
import {RateLimitOverride} from '@models/rateLimitOverride';
import {RateLimitOverrideDocument} from '@app/types/rateLimiter';
import {RedisService} from '@configs/redis';
import {Request, Response, NextFunction} from 'express';
import {TokenContext} from '@app/types/shared';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import z from 'zod';

dotenv.config();

const ENABLE_GLOBAL_RATE_LIMIT =
  process.env.ENABLE_GLOBAL_RATE_LIMIT === 'true';

const defaultRateLimitOptions: RateLimitOptions = {
  windowMs: 60 * 60 * 1000, // 1 hour default
  maxRequests: 100, // 100 requests per hour default
  keyPrefix: 'ratelimit:',
};

export class RateLimiter {
  private redis: Redis;
  private options: RateLimitOptions;
  private globalRateLimitEnabled: boolean;

  constructor(
    options: RateLimitOptions = defaultRateLimitOptions,
    redis: Redis = RedisService.getInstance().getClient(),
    globalRateLimitEnabled: boolean = ENABLE_GLOBAL_RATE_LIMIT,
  ) {
    this.redis = redis;
    this.options = {
      ...options,
    };
    this.globalRateLimitEnabled = globalRateLimitEnabled;
  }

  /**
   * Generates a unique key for rate limiting based on user authentication or IP
   * Format: {prefix}:user:{userId}:{path} for authenticated users
   * Example: ratelimit:user:123:GET
   * Format: {prefix}:ip:{ipAddress}:{path} for non-authenticated users
   * Example: ratelimit:ip:192.168.1.100:GET
   */
  public getKey(req: Request): string {
    const path = req.path;

    // Check for authentication token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(
          token,
          JWT_SECRET,
          JWT_VERIFY_OPTIONS,
        ) as TokenContext;
        if (decoded.userInfo.id) {
          // If this is ENABLE_GLOBAL_RATE_LIMIT is true, we are using global rate limiting.
          // Otherwise, we are using unique limits for each path.
          return this.globalRateLimitEnabled
            ? `${this.options.keyPrefix}:user:${decoded.userInfo.id}`
            : `${this.options.keyPrefix}:user:${decoded.userInfo.id}:${path}`;
        }
      } catch (error) {
        // Token verification failed, fallback to IP
      }
    }

    // Fallback to IP-based rate limiting
    const ip =
      req.headers['x-real-ip'] ||
      (typeof req.headers['x-forwarded-for'] === 'string' &&
        req.headers['x-forwarded-for'].split(',').shift()) ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      req.ip;
    return this.globalRateLimitEnabled
      ? `${this.options.keyPrefix}:ip:${ip}`
      : `${this.options.keyPrefix}:ip:${ip}:${path}`;
  }

  /**
   * Determines the rate limit configuration for the current request
   */
  private async getRateLimit(req: Request): Promise<RateLimitConfig> {
    // Check for temporary override first - support path pattern matching
    const override = await RateLimitOverride.findOne({
      $or: [
        {path: req.path},
        {path: {$regex: this.convertPathPatternToRegex(req.path)}},
      ],
      startsAt: {$lte: new Date()},
      expiresAt: {$gt: new Date()},
    });

    // Verify JWT token for authenticated users
    let isAuthenticated = false;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        jwt.verify(token, JWT_SECRET, JWT_VERIFY_OPTIONS);
        isAuthenticated = true;
      } catch (error) {
        isAuthenticated = false;
      }
    }

    if (override) {
      return {
        windowMs: override.windowMs,
        maxRequests: isAuthenticated
          ? override.authenticatedMaxRequests || override.maxRequests
          : override.maxRequests,
      };
    }

    // Check for path-specific override
    if (this.options.override?.[req.path]) {
      const override = this.options.override[req.path];
      return {
        windowMs: override.windowMs,
        maxRequests: isAuthenticated
          ? override.authenticatedMaxRequests || override.maxRequests
          : override.maxRequests,
      };
    }

    const maxRequests = isAuthenticated
      ? this.options.authenticatedMaxRequests || this.options.maxRequests
      : this.options.maxRequests;

    return {
      windowMs: this.options.windowMs,
      maxRequests,
    };
  }

  /**
   * Converts path pattern with wildcards to regex
   * e.g., /api/compliments/* -> ^\/api\/compliments\/.*$
   */
  private convertPathPatternToRegex(path: string): string {
    return '^' + path.replace(/\*/g, '.*').replace(/\//g, '\\/') + '$';
  }

  /**
   * Adds a temporary rate limit override for a specific path
   */
  public async addTemporaryOverride(
    path: string,
    config: RateLimitConfig,
    durationMs: number,
    userId?: string,
  ): Promise<RateLimitOverrideDocument> {
    // Validate config

    const rateLimitConfigSchema = z.object({
      windowMs: z.number().positive(),
      maxRequests: z.number().positive(),
    });

    try {
      rateLimitConfigSchema.parse(config);
    } catch (e) {
      throw new ValidationError('Invalid rate limit configuration');
    }

    const override = new RateLimitOverride({
      path,
      ...config,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + durationMs),
      createdBy: userId,
    });

    const savedOverride = await override.save();

    return savedOverride;
  }

  /**
   * Rate limiting middleware implementing a sliding window algorithm using Redis sorted sets.
   *
   * Core Concept:
   * At any given moment, looking back exactly one window period,
   * there should never be more than the maximum allowed requests in that window.
   *
   * Implementation Details:
   * 1. Uses Redis Sorted Set (ZSET) to store timestamps of requests:
   *    - Score: timestamp
   *    - Member: timestamp as string
   *    This allows for efficient range queries and automatic ordering
   *
   * 2. For each request:
   *    a. Calculate window start (current time - window period)
   *    b. Count existing requests in window BEFORE adding new request
   *    c. If at limit, calculate wait time based on oldest request:
   *       - Find oldest request timestamp
   *       - Wait time = (oldest timestamp + window period) - current time
   *       This ensures client only needs to wait until oldest request expires
   *    d. If under limit, atomically:
   *       - Add new request timestamp
   *       - Remove all expired requests (older than window start)
   *       - Set TTL on entire key for cleanup
   *
   * Example Scenarios:
   * - 100 requests/hour limit:
   *   a. 100 requests in 1 minute: Must wait 59 minutes for first request to expire
   *   b. 100 requests over 50 minutes: Must wait 10 minutes for first request to expire
   *   c. After any request expires, a new request can be made immediately
   *
   * Rate Limit Headers:
   * - X-RateLimit-Limit: Maximum requests allowed in window
   * - X-RateLimit-Remaining: Requests remaining in current window
   * - X-RateLimit-Reset: Unix timestamp when the window resets
   */
  middleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get unique identifier for the requester (either user ID or IP)
      // Format: ratelimit:user:123:GET or ratelimit:ip:192.168.1.1:GET
      const key = this.getKey(req);

      // Get rate limit settings (considers auth status and path-specific overrides)
      // Returns: { windowMs: number, maxRequests: number }
      const rateLimit = await this.getRateLimit(req);

      // Calculate the start of our sliding window
      // Example: If window is 1 hour and current time is 2:00 PM,
      // windowStart would be 1:00 PM
      const now = Date.now();
      const windowStart = now - rateLimit.windowMs;

      // Count how many requests exist in current window
      // ZCOUNT returns count of elements with scores between windowStart and infinity
      // This check happens BEFORE adding the new request for accurate limiting
      const currentCount = await this.redis.zcount(key, windowStart, '+inf');

      // If we've hit our limit, calculate when the next request can be made
      if (currentCount >= rateLimit.maxRequests) {
        // Get the timestamp of the oldest request in our window
        // ZRANGE returns array of [member, score] for the oldest entry
        const oldestRequests = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        const oldestTimestamp = parseInt(oldestRequests[0]);

        // Calculate how long until the oldest request expires
        // Example: If oldest request was at 1:00 PM and window is 1 hour,
        // client needs to wait until 2:00 PM
        const resetTime = oldestTimestamp + rateLimit.windowMs - now;

        // Set standard rate limit headers to help clients
        // X-RateLimit-Limit: Total requests allowed in window
        res.setHeader('X-RateLimit-Limit', rateLimit.maxRequests);

        // X-RateLimit-Remaining: How many requests client has left
        res.setHeader(
          'X-RateLimit-Remaining',
          Math.max(0, rateLimit.maxRequests - currentCount),
        );

        // X-RateLimit-Reset: Unix timestamp when the window resets
        const resetTimestamp = oldestTimestamp + rateLimit.windowMs;
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetTimestamp / 1000));

        // Retry-After: Number of seconds to wait before making a new request
        res.setHeader(
          'Retry-After',
          Math.ceil(Math.max(0, resetTime / 1000)), // Convert ms to seconds
        );

        throw new RateLimitError(
          'Too Many Requests',
          Math.ceil(Math.max(0, resetTime / 1000)), // Convert ms to seconds
        );
      }

      // If we're under the limit, perform atomic operations:
      await this.redis
        .multi()
        // 1. Add current request to the sorted set
        // ZADD key score member
        // Using timestamp as both score and member for easy range queries
        // Redis Command: ZADD ratelimit:user:123:GET 1633075200 "1633075200"
        // Redis Command: ZADD ratelimit:ip:123.231.312.123:GET 1633075200 "1633075200"
        .zadd(key, now, now.toString())

        // 2. Remove all entries older than our window
        // ZREMRANGEBYSCORE key min max
        // Removes any requests that occurred before windowStart
        // Redis Command: ZREMRANGEBYSCORE ratelimit:user:123:GET 0 1633071600
        // Redis Command: ZREMRANGEBYSCORE ratelimit:ip:123.231.312.123:GET 0 1633071600
        .zremrangebyscore(key, 0, windowStart)

        // 3. Set TTL on the key to auto-cleanup
        // EXPIRE key seconds
        // Converts windowMs to seconds and rounds up
        // Redis Command: EXPIRE ratelimit:user:123:GET 3600
        // Redis Command: EXPIRE ratelimit:ip:123.231.312.123:GET 3600
        .expire(key, Math.ceil(rateLimit.windowMs / 1000))
        .exec();

      // Set standard rate limit headers to help clients
      // X-RateLimit-Limit: Total requests allowed in window
      res.setHeader('X-RateLimit-Limit', rateLimit.maxRequests);

      // X-RateLimit-Remaining: How many requests client has left
      res.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, rateLimit.maxRequests - currentCount),
      );

      // X-RateLimit-Reset: Unix timestamp when the window resets
      // Tells client when they'll have a full quota again
      res.setHeader(
        'X-RateLimit-Reset',
        Math.ceil((now + rateLimit.windowMs) / 1000),
      );

      // Request is within limits
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const rateLimiterMiddleware = () => {
  const limiter = new RateLimiter(rateLimiterConfig);
  return limiter.middleware;
};
