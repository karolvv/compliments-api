# Compliments API

A rate-limited REST API for a compliments application that implements sliding window rate limiting with configurable overrides.

> NOTE: Considering this project is run using `npm run dev:docker:up`, it might take a while to start when building for the first time on your machine and your editor might not be able to resolve the imports. To resolve the imports, you can run `npm install` in the root directory.

## Table of Contents

- [Specification & Implementation Map](#specification--implementation-map)
  - [Core Requirements](#core-requirements)
  - [Bonus Requirements](#bonus-requirements)
  - [Added Specifications](#added-specifications)
- [Key Technologies & Rationale](#key-technologies--rationale)
  - [Core Dependencies](#core-dependencies)
  - [Dependencies](#dependencies)
  - [Development Dependencies](#development-dependencies)
- [Rate Limiting and Rate Limiting Overrides](#rate-limiting-and-rate-limiting-overrides)
  - [Rate Limiting Implementation](#rate-limiting-implementation)
  - [Caveats with Rate Limiting Based on IP Address](#caveats-with-rate-limiting-based-on-ip-address)
  - [Core Rate Limiting Concepts](#core-rate-limiting-concepts)
  - [Rate Limit Override System](#rate-limit-override-system)
- [Running the Project](#running-the-project)
  - [Prerequisites](#prerequisites)
  - [Development Setup](#development-setup)
  - [API Documentation](#api-documentation-swagger-ui)
  - [Development Features](#development-features)
- [Testing](#testing)
  - [Running Tests](#running-tests)
  - [Integration Test Environment](#integration-test-environment)
- [Project Structure](#project-structure)
- [Authentication and Authorization](#authentication-and-authorization)
  - [Authentication Flow](#authentication-flow)
  - [Security Features](#security-features)
  - [Authorization](#authorization)
  - [Authentication & Authorization Example Usage](#authentication--authorization-example-usage)
  - [Security Best Practices](#security-best-practices)
- [Caching](#caching)
  - [Cache Configuration](#cache-configuration)
  - [Caching Implementation](#caching-implementation)
  - [Caching Usage Examples](#caching-usage-examples)
  - [Cache Control](#cache-control)
  - [Benefits](#benefits)
  - [Cache-Related Headers](#cache-related-headers)
  - [Best Practices](#best-practices)

## Specification & Implementation Map

This project implements a rate-limited REST API that satisfies the following requirements:

### Core Requirements

✅ **HTTP Service with Middleware Pattern**

- Built using Express.js with TypeScript
- Implements middleware pattern for request handling
- Full request flow documentation in `src/middlewares/rateLimiter.ts`

✅ **Rate Limiting Implementation**

- Uses Redis for sliding window rate limiting
- Tracks requests by IP and/or user ID
- Returns HTTP 429 with appropriate headers when limit exceeded

✅ **Global Rate Limiting**

- Configurable via `ENABLE_GLOBAL_RATE_LIMIT` environment variable
- Applied across all routes when enabled
- Configuration in `configs/rateLimiter.ts`

✅ **Path-Specific Overrides**

- Supports static configuration overrides
- Supports dynamic administrative overrides via API
- Full override documentation in "Rate Limit Override System" section

✅ **Authentication-Aware Limits**

- Different limits for authenticated (200/hour) vs unauthenticated (100/hour) users
- JWT-based authentication system
- Documented in "Authentication-Aware Limits" section

### Bonus Requirements

✅ **Sliding Log Algorithm**

- Implemented using Redis sorted sets
- Provides granular control over request timing
- Detailed implementation in rate limiter middleware

✅ **Temporary Rate Limit Overrides**

- Supports time-windowed overrides
- Administrative API for dynamic override management
- Override system documentation included

✅ **IP-Based Limiting Caveats**

- Comprehensive discussion of challenges:
  - Proxy and NAT issues
  - CDN considerations
  - IPv6 complexity
  - Mobile networks
  - VPN services

✅ **Unit & Integration Tests**

- Comprehensive test suite
- Includes rate limiter specific tests
- Uses mongodb-memory-server for isolation

✅ **IP-Based Limiting Caveats**

- Outlined some caveats with a rate limiting approach that relies on the request
  origin IP address only ([Caveats with Rate Limiting Based on IP Address](#caveats-with-rate-limiting-based-on-ip-address))

### Added Specifications

🚀 **Advanced Rate Limiting Algorithms**

- Implemented sliding window counter algorithm for precise rate limiting
- Added support for multiple time windows (seconds, minutes, hours)
- Distributed rate limiting support via Redis

🚀 **Enhanced Configuration**

- Dynamic rate limit updates via API endpoints
- Environment-based configuration
- Per-route custom error messages
- Configurable response headers

🚀 **Robust Error Handling**

- Detailed rate limit error responses
- Custom error formatting
- Remaining quota information in headers

🚀 **Security Features**

- Multiple IP detection strategies
- Proxy support with X-Forwarded-For handling
- API key validation and management

🚀 **Monitoring & Debugging**

- Rate limit metrics tracking
- Comprehensive logging
  - Request tracking with unique identifiers
  - Detailed error logging
  - Detailed exception logging
  - Detailed rejection logging

🚀 **Caching**

- Basic caching implementation
- Cache-related headers that will help clients understand the cache behavior
  - Compatible with both cache hit and cache miss scenarios
  - Compatible withCloudFront

🚀 **Comprehensive Testing**

- Unit tests with Jest
- Integration tests
- Load testing scenarios

🚀 **Documentation**

- API documentation with Swagger/OpenAPI
- Detailed setup instructions
- Configuration examples
- Best practices guide

## Key Technologies & Rationale

### Core Dependencies

### Dependencies

#### Core Framework & Language

- **express**

  - Description: Fast, unopinionated, minimalist framework for Node.js.
  - Why I used it: It's the most widely-used Node.js framework with excellent middleware support and an easy learning curve. Because this is a small project, I didn't need an opinionated framework like Nest. If it were built to grow and be maintained by a larger team, I would have used Nest or something more opinionated.

- **typescript**
  - Description: Superset of JavaScript with static typing.
  - Why I used it: I wanted to make use of TypeScript's static typing, IDE support, and developer experience. Especially considering it helps catch errors before runtime.

#### Database & Caching

- **mongoose**

  - Description: MongoDB object modeling tool.
  - Why I used it: I needed a robust ODM for MongoDB that provides a schema-based solution. I chose MongoDB because it's the most popular NoSQL database and is well-supported by the Node.js ecosystem. Given this the nature of this project, I didn't need a full relational database like Postgres or MySQL.

- **ioredis**
  - Description: Redis client for Node.js.
  - Why I used it: For implementing rate limiting and caching. I needed a Redis client that was both performant and reliable.

#### Security

- **bcrypt**

  - Description: Library for hashing passwords with salt, securing stored passwords.
  - Why I used it: Hashing passwords is a core security feature, and Bcrypt is the industry standard for this.

- **helmet**

  - Description: Out of the box collection of middleware functions that help secure Express apps via HTTP headers
  - Why I used it: Helmet helps protect against common web vulnerabilities by setting appropriate HTTP headers

- **jsonwebtoken**

  - Description: Implementation of JSON Web Tokens for authentication.
  - Why I used it: I needed a stateless authentication mechanism, and JWT provides a secure. This is widely used in industry.

- **cors**

  - Description: Express middleware that enables Cross-Origin Resource Sharing (CORS)
  - Why I used it: To ensure the API can be safely accessed from different domains while maintaining security through CORS configuration. This is a core security feature and when if this project were productionised, I would extend the CORS configuration to be more restrictive.

- **cookie-parser**
  - Description: Parse Cookie header and populate req.cookies with an object keyed by cookie names
  - Why I used it: I need this for handling HTTP cookies in Express, particularly for our refresh token and logout implementation

#### Validation & Type Checking

- **zod**

  - Description: TypeScript-first schema validation with static type inference
  - Why I used it: I chose Zod because it is robust and provides a great developer experience.

- **uuid**
  - Description: Generates and validates RFC-compliant UUIDs
  - Why I used it: Needed for generating unique identifiers across the application. I am mainly using this for requestId generation if the client does not provide one.

#### Configuration & Environment

- **dotenv**
  - Description: Loads environment variables from a .env file into process.env
  - Why I used it: Makes configuration secure by allowing environment variables to be stored outside of the codebase.

#### API Documentation

- **swagger-jsdoc**

  - Description: Enables you to integrate Swagger using JSDoc comments
  - Why I used it: Allows us to generate API documentation directly from code comments, keeping docs and code in sync

- **swagger-ui-express**

  - Description: Middleware to serve the Swagger UI bound to your Swagger document
  - Why I used it: Provides an interactive API documentation interface that makes testing and understanding the API easier. When running the project, you can view the documentation at `http://localhost:4000/api-docs` if you run with docker.

- **swagger-themes**
  - Description: Cool themes you can customize for Swagger UI
  - Why I used it: Makes the docs look nicer and easier to read with some custom styling

#### Logging

- **winston**

  - Description: Flexible logging library for different outputs
  - Why I used it: Needed a solid logging solution for various formats and destinations

- **winston-daily-rotate-file**
  - Description: Rotates log files daily for winston
  - Why I used it: Keeps log files manageable by rotating them automatically

### Development Dependencies

#### Testing Framework & Utilities

- **jest**

  - Description: Testing framework for JavaScript/TypeScript
  - Why I used it: Jest is a complete testing tool with great TypeScript support and a fantastic developer experience

- **@jest/globals**

  - Description: TypeScript types for Jest globals
  - Why I used it: Helps with TypeScript when testing with Jest

- **ts-jest**

  - Description: Lets you run Jest tests on TypeScript projects with source map support
  - Why I used it: Needed for testing TypeScript with Jest

- **supertest**

  - Description: Library for testing HTTP endpoints
  - Why I used it: Simplifies writing API tests

- **mongodb-memory-server**
  - Description: Starts a real MongoDB server for testing
  - Why I used it: Allows testing without needing MongoDB installed

#### Development Tools

- **gts**

  - Description: Google TypeScript Style guide, formatter, and linter
  - Why I used it: Keeps code style consistent and catches errors

- **nodemon**

  - Description: Watches for changes and restarts the server automatically
  - Why I used it: Makes development smoother by auto-restarting the server on changes

- **ts-node**

  - Description: Run TypeScript directly in Node.js
  - Why I used it: Lets me run TypeScript without compiling first

- **tsconfig-paths**

  - Description: Load modules based on tsconfig paths
  - Why I used it: Makes imports cleaner and easier to manage

- **concurrently**
  - Description: Run multiple commands at once in the same terminal
  - Why I used it: Handy for running the API and docs server together

## Rate Limiting and Rate Limiting Overrides

We use Redis for rate limiting, with options to customize limits for different paths. By default, it's applied globally, but you can set specific limits for individual paths.

- Global Rate Limiting vs Individual Path Rate Limiting is set via the environment variable `ENABLE_GLOBAL_RATE_LIMIT`.
  - When `ENABLE_GLOBAL_RATE_LIMIT` is `true`, the global rate limiting is applied.
  - When `ENABLE_GLOBAL_RATE_LIMIT` is `false`, the individual path rate limiting is applied.
- Path Specific Overrides to either Global or Individual Path Rate limiting strategy can be set in two different ways:
  - Through the `override` setting, which is a JSON object where each key is a path and each value is a `RateLimitConfig` object.
  - Through the Rate Limiting Overrides endpoint, which allows for dynamic setting of rate limiting overrides by administrative users of this API.

## Rate Limiting Implementation

The project implements sliding window rate limiting using Redis as the backing store.

```typescript
/**
 * FILE: src/middlewares/rateLimiter.ts
 *
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

    // Request is within limits, proceed to next middleware
    next();
  } catch (error) {
    next(error);
  }
};
```

### Caveats with Rate Limiting Based on IP Address

Rate limiting based solely on IP addresses presents several challenges, which is why our implementation uses a hybrid approach: IP-based limiting for unauthenticated requests and user ID-based limiting for authenticated requests.

1. **Proxy and NAT Issues**

   - **Challenge**: Multiple users behind a shared NAT or corporate proxy appear as a single IP
   - **Traditional Solution**: Complex IP parsing and allowlisting
   - **Our Approach**:
     - Authenticated users are tracked by their unique `userId`, completely bypassing NAT issues
     - Only unauthenticated traffic is subject to IP-based limits

2. **CDN and Load Balancer Considerations**

   - **Challenge**: CDNs may mask the original client IP unless properly configured
   - **Traditional Solution**: Complex header parsing for `X-Forwarded-For`
   - **Our Approach**:

     - Authenticated requests don't rely on IP detection
     - IP parsing only needed for anonymous traffic
     - Uses `getKey()` method in the rate limiter middleware to intelligently select identifier:

       ```typescript
       // Simplified from our implementation
       const key = user ? `ratelimit:user:${user.id}` : `ratelimit:ip:${ip}`;
       ```

3. **IPv6 Complexity**

   - **Challenge**: IPv6 addresses can be temporarily assigned or rotated
   - **Traditional Solution**: IPv6 subnet tracking
   - **Our Approach**:
     - Authenticated users are unaffected by IPv6 rotation
     - Higher rate limits for authenticated users incentivize authentication
     - IP-based limits only affect anonymous traffic

4. **Mobile Networks**

   - **Challenge**: Mobile carriers use carrier-grade NAT and dynamic IPs
   - **Traditional Solution**: Broader IP ranges with higher limits
   - **Our Approach**:

     - Mobile apps can authenticate users for consistent limiting
     - JWT-based authentication provides reliable user tracking
     - Different rate limit tiers:

       ```typescript
       export const rateLimiterConfig: RateLimitOptions = {
         maxRequests: 50, // Unauthenticated (IP-based)
         authenticatedMaxRequests: 100, // Authenticated (user-based)
       };
       ```

5. **VPN and Proxy Services**
   - **Challenge**: Users can bypass IP-based limits using VPN services
   - **Traditional Solution**: VPN detection and blocking
   - **Our Approach**:
     - Critical endpoints require authentication
     - VPN rotation only affects unauthenticated endpoints
     - Authenticated users maintain consistent limits across IP changes

Our hybrid implementation provides several advantages:

```typescript
// Example of our authentication-aware key generation
getKey(req: Request): string {
  const user = req.user;
  const path = req.path;

  if (user && user.id) {
    // Authenticated: Use user ID
    return `${this.keyPrefix}user:${user.id}:${path}`;
  } else {
    // Unauthenticated: Fall back to IP
    const ip = getClientIP(req);
    return `${this.keyPrefix}ip:${ip}:${path}`;
  }
}
```

This design:

- Provides reliable rate limiting for authenticated users
- Maintains basic protection against anonymous abuse
- Encourages authentication for better rate limits
- Simplifies implementation by reducing IP-detection complexity
- Supports both global and path-specific rate limiting

### Core Rate Limiting Concepts

#### Sliding Window Algorithm

The rate limiter uses a sliding window algorithm implemented with Redis sorted sets (ZSET). This provides several advantages:

- More accurate than fixed window counters
- Prevents request spikes between windows
- Efficiently manages memory by automatically expiring old entries
- Provides precise tracking of request timing

#### Two Rate Limiting Strategies

1. **Global Rate Limiting** (`ENABLE_GLOBAL_RATE_LIMIT=true`)

   - Limits are applied across all endpoints for a user/IP
   - Key Format: `ratelimit:user:{userId}` or `ratelimit:ip:{ipAddress}`
   - Best for controlling overall API usage

2. **Path-Based Rate Limiting** (`ENABLE_GLOBAL_RATE_LIMIT=false`)
   - Limits are tracked separately for each endpoint
   - Key Format: `ratelimit:user:{userId}:{path}` or `ratelimit:ip:{ipAddress}:{path}`
   - Better for fine-grained control of specific endpoints

#### Authentication-Aware Limits

- Different limits for authenticated vs unauthenticated users
- Authenticated users identified by JWT token
- Falls back to IP-based limiting if token is invalid

#### Rate Limiting Related Errors

`RateLimitError`: Thrown when the rate limit is exceeded.

- Status Code: 429
- Message: `Too Many Requests`
- Headers:
  - `X-RateLimit-Limit`: Maximum requests allowed in window
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Unix timestamp when the window resets
  - `Retry-After`: Seconds to wait before making a new request

### Rate Limit Override System

The system supports two types of rate limit overrides:

#### 1. Static Configuration Overrides

Defined in `configs/rateLimiter.ts`:

```typescript
export const rateLimiterConfig: RateLimitOptions = {
  windowMs: TIME_IN_MS.TEN_SECONDS,
  maxRequests: 50,
  authenticatedMaxRequests: 100,
  keyPrefix: 'ratelimit:',
  override: {
    'localhost:4000/api/compliments/random': {
      windowMs: TIME_IN_MS.THIRTY_SECONDS,
      maxRequests: 100,
      authenticatedMaxRequests: 200,
    },
  },
};
```

- Set at application startup
- Cannot be changed without redeployment
- Good for permanent rate limit rules

#### 2. Dynamic Administrative Overrides (when logged in as an admin user)

> **Note:** Administrative overrides can only be set by users with the `ADMIN` role. You can use the seeded `admin` user to test this functionality.
> Logging in with the seeded `admin` user:
>
> ```typescript
>  POST localhost:4000/api/auth/login
>  {
>    "email": "admin@example.com",
>    "password": "admin.password"
>  }
> ```

Set via the `localhost:4000/api/admin/rate-limits` endpoint:

- **Create API Added Override**:

  ```bash
  POST localhost:4000/api/admin/rate-limits
  {
    "path": "localhost:4000/api/compliments/random",
    "maxRequests": 100,
    "authenticatedMaxRequests": 200,
    "startsAt": "2024-03-01T00:00:00Z",
    "expiresAt": "2024-03-02T00:00:00Z"
  }
  ```

- **View All API Added Overrides**:

  ```bash
  GET localhost:4000/api/admin/rate-limits
  ```

- **View All API Added Overrides For a Specific Path**:

  ```bash
  GET localhost:4000/api/admin/rate-limits?path=localhost:4000/api/compliments/random
  ```

- **View All Active API Added Overrides**:

  ```bash
  GET localhost:4000/api/admin/rate-limits/active
  ```

- **View All Active API Added Overrides For a Specific Path**:

  ```bash
  GET localhost:4000/api/admin/rate-limits/active?path=localhost:4000/api/compliments/random
  ```

- **Remove API Added Override**:

  ```bash
  DELETE localhost:4000/api/admin/rate-limits
  {
    "path": "localhost:4000/api/compliments/random"
  }
  ```

- Stored in MongoDB
- Can be set/removed dynamically
- Support time windows (temporary overrides)
- Ideal for handling temporary traffic spikes

### Rate Limiting Middleware Implementation

The rate limiting middleware (`src/middlewares/rateLimiter.ts`) implements several key features:

#### 1. Request Tracking

```typescript
// Add current request to sorted set with timestamp
await redis.zadd(key, now, now.toString());
// Remove expired entries
await redis.zremrangebyscore(key, 0, windowStart);
```

#### 2. Limit Checking

```typescript
const currentCount = await redis.zcount(key, windowStart, '+inf');
if (currentCount >= rateLimit.maxRequests) {
  // Calculate wait time and return error
}
```

#### 3. Standard Headers

The middleware sets standard rate limit headers:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets
- `Retry-After`: Seconds to wait when limited

### Why This Implementation?

1. **Accuracy**: The sliding window algorithm provides more accurate rate limiting than simple counters.

2. **Scalability**:

   - Redis provides atomic operations
   - Efficient memory usage with automatic cleanup
   - Supports high throughput

3. **Flexibility**:

   - Supports both global and path-based limiting
   - Multiple override mechanisms
   - Authentication-aware limits

4. **Developer Experience**:

   - Standard rate limit headers
   - Clear error messages
   - Swagger documentation

5. **Operations**:
   - Dynamic configuration
   - Monitoring capabilities
   - Administrative controls

### Example Usage

1. **Basic Rate Limiting**:

   ```typescript
   import {RateLimiter} from '@middlewares/rateLimiter';
   import {rateLimiterConfig} from '@configs/rateLimiter';
   import errorHandlingMiddleware from '@middlewares/errorHandling';
   import redisClient from '@configs/redis';

   // Create rate limiter instance
   const rateLimiter = new RateLimiter(
     rateLimiterConfig,
     redisClient,
     enableGlobalRateLimit,
   );

   // Apply Rate limiter Middleware
   app.use(rateLimiter.middleware);

   // Routes
   app.use('/api', router);

   // Error handling
   app.use(errorHandlingMiddleware);

   // Start server and export server instance for integration tests
   let server: ReturnType<typeof app.listen>;
   if (process.env.NODE_ENV !== 'test') {
     server = app.listen(port, async () => {
       await initializeDatabase();
       console.log(`[server]: Server is running on http://localhost:${port}`);
     });
   }

   export {server};
   ```

2. **Custom Configuration**:

   ```typescript
   const options: RateLimitOptions = {
     windowMs: 60000,
     maxRequests: 100,
     authenticatedMaxRequests: 200,
   };
   app.use(new RateLimiter(options).middleware);
   ```

3. **Dynamic Override (Via the API)**:

   ```typescript
   await rateLimitService.createOverrideWindow(
     'localhost:4000/api/endpoint',
     {maxRequests: 1000, windowMs: 3600000},
     new Date(),
     24,
     userId,
   );
   ```

## Running the Project

### Prerequisites

- Docker and Docker Compose
- Node.js (v18+)
- npm or yarn

### Development Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd compliments-api
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Choose ONE of these methods to start the development environment:

   **Option A: Using Docker (Recommended)**

   The application will run behind `localhost:4000`.

   ```bash
   # Start the application and all dependencies
   npm run dev:docker:up

   # To stop the application:
   npm run dev:docker:down
   ```

   **Option B: Running Locally**

   The application will run behind `localhost:3000`.

   ````bash
   # 1. Install dependencies
   npm install

   # 2. Start MongoDB and Redis containers
   npm run setup:local

   # 3. Update your .env file with local connection details:

   ```env
   DATABASE_URL=mongodb://admin:password@localhost:27017/compliments
   REDIS_HOST=localhost
   REDIS_PASSWORD='' <!-- Leave blank or remove -->
   ```

   # 4. Start the development server

   npm run dev

   # To stop the local environment:

   npm run teardown:local

   ````

   **Option C: Using Docker Compose Directly**

   The application will run behind `localhost:4000`.

   ```bash
   # Start the application
   docker compose up --build

   # To stop the application:
   docker compose down -v
   ```

> **Note:** The first build using Docker may take several minutes as it needs to download and build all dependencies.

The API will be available at:

- API: <http://localhost:4000>
- API Documentation: <http://localhost:4000/api-docs>
- Debug port: 9229

### API Documentation (Swagger UI)

Check out the API docs on Swagger UI. It shows all endpoints, their formats, and any needed authentication.

To access the Swagger UI documentation, navigate to:

- <http://localhost:4000/api-docs>

![Swagger UI Screenshot](./assets/swagger-ui.jpeg)

#### Features of the Swagger Documentation

- **Interactive Interface**: Test API endpoints right from your browser.
- **Detailed Descriptions**: Get all the info you need about parameters, request bodies, and responses.
- **Authentication**: Use JWT tokens in Swagger UI to test protected endpoints.
- **Schema Definitions**: Clear data model definitions for the API.

#### How to Use

1. **Navigate to the Swagger UI**: Open your browser and go to <http://localhost:4000/api-docs>.
2. **Explore Endpoints**: Browse through the list of available endpoints categorized by their functionality.
3. **Test Endpoints**: Click on any endpoint to expand its details. You can fill in the required parameters and execute the request directly from the UI.
4. **Authenticate**: For endpoints that require authentication, click on the "Authorize" button and enter your JWT token to authenticate your session.

- You can use the seeded `admin` user to test this functionality.
- Logging in with the seeded `admin` user will allow you to test all parts of the API. To do so, see the example below.

#### Examples

To test the `GET localhost:4000/api/compliments` endpoint:

1. Expand the `GET localhost:4000/api/compliments` section.
2. Click on the "Try it out" button.
3. Enter the required parameters (if any).
4. Click on the "Execute" button to see the response.

To test the `GET localhost:4000/api/auth/login` endpoint and authenticate to the API:

1. Expand the `GET localhost:4000/api/auth/login` section.
2. Click on the "Try it out" button.
3. Enter the required parameters (the default email and password is `admin@example.com` and `admin.password`). This will return a JWT token.
4. Click on the "Execute" button to see the response.
5. Copy the JWT token.
6. Paste the JWT token in the "Authorization" section in the top right corner.
7. Click "Authorize".

This interactive documentation makes it easy to understand and test the API without needing to write any code.

For more information on how to use Swagger UI, refer to the [Swagger UI documentation](https://swagger.io/tools/swagger-ui/).

### Development Features

- Hot-reloading enabled
- Debug configuration ready for VS Code
- API documentation available through Swagger UI
- MongoDB data persisted through Docker volumes

## Testing

The project includes several types of tests:

### Running Tests

1. Unit Tests:

   ```bash
   npm run test:unit
   ```

2. Integration Tests (by domain):

   ```bash
   # Auth endpoints
   npm run test:integration:auth
   # Compliment endpoints
   npm run test:integration:compliment
   # User endpoints
   npm run test:integration:user
   # Rate limiting tests
   npm run test:integration:ratelimit
   ```

### Integration Test Environment

- Uses `docker-compose.test.yml` for the test environment
- Includes coverage reporting
- Separate test configuration through jest.config.js

## Project Structure

```bash
logs/ # Logs
mongodb/ # MongoDB seed data
postman/ # Postman collection
src/ # Source code
├── configs/ # Configuration
├── controllers/ # Request handlers
├── middlewares/ # Express middleware
├── models/ # MongoDB schemas
├── routes/ # API routes
├── services/ # Business logic
├── types/ # TypeScript types
├── utils/ # Helper functions
├── index.ts # Application entry point
└── swagger.ts # Swagger configuration
test/ # Tests

```

## Postman Collection & Environment

Check out the `postman/` directory for Postman collection and environment files to test the API.

- `compliments-api.postman_collection.json`: Contains all API endpoints and example requests
- `ComplimentsAPI.postman_environment.json`: Contains environment variables for the API

### Setting Up Postman

1. **Import the Collection and Environment**:

   - Open Postman
   - Click "Import" in the top left
   - Drag both files or select them from the `postman/` directory
   - Both the collection and environment will be imported

2. **Select the Environment**:
   - Click the environment dropdown in the top right
   - Select "ComplimentsAPI"

### Collection Features

The collection is organized into logical folders:

- **Auth**: Authentication-related endpoints

  - Login (as User or Admin)
  - Register
  - Refresh Token
  - Logout
  - _Note: Login requests automatically set the access token for subsequent requests_

- **Compliments**: Compliment management

  - Get all compliments
  - Get random compliment
  - Get compliment by ID
  - Create new compliment
  - Update compliment
  - Delete compliment

- **Users**: User management

  - Get all users
  - Get user by ID
  - Get user by username
  - Update user
  - Delete user

- **Rate Limit Manager**: Rate limiting configuration (Admin only)
  - Get rate limit overrides
  - Get active rate limit overrides
  - Set custom path rate limit
  - Remove rate limit override

### Authentication Handling

The collection automatically manages authentication:

1. **Login Flow**:

   - Use either "Login As User" or "Login As Admin" request
   - The response's access token is automatically stored in the environment
   - All subsequent requests will use this token

2. **Default Credentials**:

   ```json
   {
     "admin": {
       "email": "admin@compliments.com",
       "password": "admin.password"
     },
     "user": {
       "email": "user@compliments.com",
       "password": "user.password"
     }
   }
   ```

3. **Token Refresh**:
   - Use the "Refresh Token" request when the access token expires
   - New token is automatically stored in the environment

### Testing Different Scenarios

1. **Rate Limiting**:

   - Send multiple requests quickly to trigger rate limits
   - Use admin endpoints to modify rate limits
   - Test different paths with custom rate limits

2. **Authentication Levels**:
   - Test as anonymous user (no login)
   - Test as regular user

## More on the API Documentation With Swagger UI

The API documentation is available at `/api-docs` when the server is running. It provides:

- Detailed endpoint descriptions
- Request/response examples
- Authentication requirements
- Rate limiting information

## Authentication and Authorization

The API implements a secure JWT-based authentication system with refresh token rotation.

### Authentication Flow

1. **Registration** (`POST /api/auth/register`):

   - Users register with email, username, and password
   - Password is hashed using bcrypt
   - Returns an access token and sets a secure HTTP-only refresh token cookie

2. **Login** (`POST /api/auth/login`):

   - Validates credentials against stored hashed password
   - Returns an access token and sets a secure HTTP-only refresh token cookie

3. **Token Refresh** (`POST /api/auth/refresh`):

   - Uses HTTP-only cookie containing refresh token
   - Validates refresh token and issues new access/refresh token pair
   - Implements token rotation for security

4. **Logout** (`POST /api/auth/logout`):
   - Invalidates refresh token in database
   - Clears refresh token cookie

### Security Features

1. **JWT Configuration**:

   ```typescript
   const JWT_SIGN_OPTIONS = {
     algorithm: 'HS256',
     expiresIn: '15m', // Short-lived access tokens
     issuer: 'compliment-api',
     audience: 'compliment-app',
   };
   ```

2. **Secure Cookie Settings**:

   - HTTP-only: Prevents JavaScript access
   - Secure: HTTPS only in production
   - SameSite: Strict
   - Path restricted to `/api/auth`
   - 7-day expiration

3. **Input Validation**:
   - Zod schema validation
   - HTML tag stripping
   - Email format verification
   - Minimum password length enforcement

### Authorization

The API implements role-based access control (RBAC) using middleware:

1. **Roles**:

   - `USER`: Default role for registered users
   - `ADMIN`: Enhanced privileges for administrative functions

2. **Protected Routes**:

   - Most routes require authentication
   - Admin routes require `ADMIN` role
   - Public paths are explicitly defined in the `PUBLIC_PATHS` constant, defined in `src/configs/auth.ts`:

     ```typescript
     export const PUBLIC_PATHS = {
       AUTH_LOGIN: '/auth/login',
       AUTH_REGISTER: '/auth/register',
       AUTH_REFRESH: '/auth/refresh',
       HEALTH_CHECK: '/health',
       RANDOM_COMPLIMENT: '/compliments/random',
       SWAGGER_JSON: '/swagger.json',
       SWAGGER_UI: '/api-docs',
     };
     ```

3. **Authorization Middleware**:
   - Validates JWT tokens
   - Checks user roles against required roles
   - Handles token expiration and invalid tokens

### Authentication & Authorization Example Usage

1. **Register a New User**:

   ```bash
   POST /api/auth/login
   {
     "email": "user@example.com",
     "password": "secure.password",
     "username": "newuser"
   }
   ```

2. **Login**:

   ```bash
   POST /api/auth/login
   {
     "email": "user@example.com",
     "password": "secure.password"
   }
   ```

3. **Using Protected Endpoints**:

   ```bash
   # Include the access token in Authorization header

   GET /api/users/{userId}

   WorkingExample: GET /api/users/507f1f77bcf86cd799439011
   Authorization: Bearer <access_token>
   ```

4. **Admin-Only Endpoints**:

   ```bash
   # Requires ADMIN role
   GET /api/admin/rate-limits
   Authorization: Bearer <admin_access_token>
   ```

### Security Best Practices

1. **Token Management**:

   - Access tokens expire after 15 minutes
   - Refresh tokens rotate on use
   - Refresh tokens expire after 7 days

2. **Password Security**:

   - Passwords hashed using bcrypt
   - Minimum 8 character requirement
   - HTML sanitization on inputs

3. **Cookie Security**:
   - HTTP-only cookies prevent XSS
   - Secure flag ensures HTTPS in production
   - Strict same-site policy prevents CSRF

## Caching

We use Redis caching to speed up the API and ease the database load. The caching middleware is applied to all routes with adjustable TTL (Time To Live) settings.

### Cache Configuration

Cache TTL values are defined in `src/configs/cache.ts`:

```typescript
export const CACHE_TTL = {
  NO_CACHE: 0, // Disable caching
  DEFAULT: 300, // 5 minutes
  EXTREMELY_SHORT: 2, // 2 seconds
  VERY_SHORT: 10, // 10 seconds
  SHORT: 60, // 1 minute
  LONG: 3600, // 1 hour
};
```

### Caching Implementation

The caching middleware (`src/middlewares/caching.ts`) implements several key features:

1. **Request-based Cache Keys**: Cache keys are generated based on:

   - HTTP method
   - URL path
   - Query parameters
   - User authentication status
   - Request body (for POST/PUT requests)

2. **Automatic Cache Invalidation**:

   - TTL-based expiration
   - Manual cache clearing for specific routes
   - Cache bypass options for certain conditions

3. **Cache Headers**:
   - `X-Cache`: Hit/Miss status
   - `X-Cache-TTL`: Remaining cache lifetime
   - `Cache-Control`: Browser caching directives

### Caching Usage Examples

1. **Basic Route Caching**:

   ```typescript
   // Apply default 5-minute cache
   app.use('/api', cacheMiddleware(redisClient, CACHE_TTL.DEFAULT));
   ```

2. **Route-Specific Cache Duration**:

   ```typescript
   // Cache random compliments for 2 seconds
   app.use(
     '/api/compliments/random',
     cacheMiddleware(redisClient, CACHE_TTL.EXTREMELY_SHORT),
   );
   ```

3. **Disable Caching**:

   ```typescript
   // No caching for authentication routes
   app.use('/api/auth', cacheMiddleware(redisClient, CACHE_TTL.NO_CACHE));
   ```

### Cache Control

The caching system provides several control mechanisms:

1. **Cache Bypass**:

   - Add `?nocache=true` to any request
   - Use `Cache-Control: no-cache` header
   - Specific routes can be configured to skip cache

2. **Manual Cache Clearing**:

   - Admin endpoints for cache management
   - Automatic clearing on certain data updates
   - Pattern-based cache invalidation

3. **Cache Monitoring**:
   - Cache hit/miss metrics
   - Memory usage tracking
   - TTL monitoring

### Benefits

1. **Performance**:

   - Reduced database load
   - Lower response times
   - Better scalability

2. **Consistency**:

   - Atomic cache operations
   - Distributed caching support
   - Predictable cache behavior

3. **Flexibility**:
   - Configurable per route
   - Easy to disable/enable
   - Support for different cache strategies

### Cache-Related Headers

The API includes several cache-related headers in responses:

```http
X-Cache: HIT
X-Cache-TTL: 298
Cache-Control: public, max-age=300
```

### Best Practices

1. **Cache Duration**:

   - Use shorter durations for frequently changing data
   - Longer durations for static content
   - Consider user experience when setting TTL

2. **Cache Keys**:

   - Include relevant request parameters
   - Consider user context
   - Avoid overly complex keys

3. **Cache Invalidation**:
   - Implement proper cache clearing
   - Use patterns for related cache entries
   - Consider cache warming for critical paths
