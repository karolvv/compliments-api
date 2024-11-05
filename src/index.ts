import {authenticationMiddleware} from '@middlewares/authentication';
import {RateLimiter} from '@middlewares/rateLimiter';
import {NotFoundError} from '@utils/errors';
import {port, corsOptions, helmetOptions} from '@configs/server';
import {rateLimiterConfig} from '@configs/rateLimiter';
import {swaggerUi, swaggerSpecification} from './swagger';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import Database from '@configs/db';
import errorHandlingMiddleware from '@middlewares/errorHandling';
import express, {Express} from 'express';
import helmet from 'helmet';
import requestLoggerMiddleware from '@middlewares/requestLogger';
import {router} from '@routes/index';
import redisClient from '@configs/redis';
import dotenv from 'dotenv';
import cacheMiddleware from '@middlewares/caching';
import {CACHE_TTL} from '@configs/cache';

dotenv.config();
const enableGlobalRateLimit = process.env.ENABLE_GLOBAL_RATE_LIMIT === 'true';
const app: Express = express();

// Create rate limiter instance
const rateLimiter = new RateLimiter(
  rateLimiterConfig,
  redisClient,
  enableGlobalRateLimit,
);

// Middleware
//// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecification));
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpecification);
});

//// Cors
app.use(cors(corsOptions));
//// Helmet
app.use(helmet(helmetOptions));
//// Request logger
app.use(requestLoggerMiddleware);
//// Rate limiter
app.use(rateLimiter.middleware);
//// Body parser
app.use(express.json());
app.use(cookieParser());
//// JWT Authentication
app.use('/api', authenticationMiddleware);
//// Routes
app.use(
  '/api',
  cacheMiddleware(redisClient, CACHE_TTL.EXTREMELY_SHORT),
  router,
);
//// Error handling
app.use(errorHandlingMiddleware);

//// Handle invalid routes
app.use((req, res, next) => {
  const path = req.path;
  next(new NotFoundError(path));
});

// Export app for testing
export {app};

// Initialize database
async function initializeDatabase() {
  const db = new Database();
  await db.connect();
}

// Start server and export server instance
let server: ReturnType<typeof app.listen>;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, async () => {
    await initializeDatabase();
    console.log(`[server]: Server is running on http://localhost:${port}`);
  });
}

export {server};
