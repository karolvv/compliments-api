import {TIME_IN_MS} from '@utils/constants';
import {RateLimitOptions} from '@app/types/rateLimiter';

export const rateLimiterConfig: RateLimitOptions = {
  windowMs: TIME_IN_MS.TEN_SECONDS,
  maxRequests: 50,
  authenticatedMaxRequests: 100,
  keyPrefix: 'ratelimit:',
  override: {
    '/api/compliments/random': {
      windowMs: TIME_IN_MS.THIRTY_SECONDS,
      maxRequests: 100,
      authenticatedMaxRequests: 200,
    },
  },
};
