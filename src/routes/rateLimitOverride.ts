import {CACHE_TTL} from '@configs/cache';
import {RateLimitOverrideController} from '@controllers/rateLimitOverride';
import {RateLimitOverrideService} from '@services/rateLimitOverride';
import {Router} from 'express';
import cacheMiddleware from '@middlewares/caching';
import redisClient from '@configs/redis';

const rateLimitOverridesRouter = Router();
const rateLimitOverrideService = new RateLimitOverrideService();
const rateLimitOverrideController = new RateLimitOverrideController(
  rateLimitOverrideService,
);

/**
 * @swagger
 * tags:
 *   name: Rate Limit Overrides
 *   description: Rate limit override management endpoints. You must be logged in as an admin to use these endpoints.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RateLimitOverride:
 *       type: object
 *       properties:
 *         path:
 *           type: string
 *           description: The API path this rate limit override applies to
 *           example: "/api/compliments/random"
 *         windowMs:
 *           type: number
 *           description: The time window in milliseconds for the rate limit
 *           example: 10000
 *         maxRequests:
 *           type: number
 *           description: The maximum number of requests allowed in the time window
 *           example: 100
 *         authenticatedMaxRequests:
 *           type: number
 *           description: The maximum number of requests allowed for authenticated users
 *           example: 200
 *         startsAt:
 *           type: string
 *           format: date-time
 *           description: The start time for the rate limit override
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: The expiration time for the rate limit override
 *         createdBy:
 *           type: string
 *           description: The ID of the user who created this override
 */

/**
 * @swagger
 * components:
 *   responses:
 *     ValidationError:
 *       description: Invalid request parameters
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidationError'
 *
 *     UnauthorizedError:
 *       description: Unauthorized - Missing or invalid token
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: error
 *               message:
 *                 type: string
 *                 example: Unauthorized
 *               code:
 *                 type: number
 *                 example: 401
 *
 *     ForbiddenError:
 *       description: Forbidden - User does not have required permissions
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: error
 *               message:
 *                 type: string
 *                 example: Forbidden
 *               code:
 *                 type: number
 *                 example: 403
 *
 *     ServerError:
 *       description: Internal Server Error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: error
 *               message:
 *                 type: string
 *                 example: Internal Server Error
 *               code:
 *                 type: number
 *                 example: 500
 */

/**
 * @swagger
 * /api/admin/rate-limits:
 *   get:
 *     summary: Get overrides for specific path
 *     description: Retrieves rate limit overrides for a specific API path
 *     tags: [Rate Limit Overrides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: path
 *         required: false
 *         schema:
 *           type: string
 *         description: The API path to get overrides for
 *         example: "/api/compliments/random"
 *     responses:
 *       200:
 *         description: List of overrides for the specified path
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RateLimitOverride'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

rateLimitOverridesRouter.get(
  '/',
  cacheMiddleware(redisClient, CACHE_TTL.EXTREMELY_SHORT),
  rateLimitOverrideController.getRecentOverrides.bind(
    rateLimitOverrideController,
  ),
);

/**
 * @swagger
 * /api/admin/rate-limits/active:
 *   get:
 *     summary: Get active rate limit overrides
 *     description: Retrieves currently active rate limit overrides
 *     tags: [Rate Limit Overrides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: path
 *         required: false
 *         schema:
 *           type: string
 *         description: The API path to get overrides for
 *         example: "/api/compliments/random"
 *     responses:
 *       200:
 *         description: List of active overrides
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RateLimitOverride'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
rateLimitOverridesRouter.get(
  '/active',
  cacheMiddleware(redisClient, CACHE_TTL.EXTREMELY_SHORT),
  rateLimitOverrideController.getActivePathOverrides.bind(
    rateLimitOverrideController,
  ),
);

/**
 * @swagger
 * /api/admin/rate-limits:
 *   post:
 *     summary: Create a new rate limit override
 *     description: Creates a new rate limit override for a specific path
 *     tags: [Rate Limit Overrides]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *               - maxRequests
 *               - authenticatedMaxRequests
 *               - startDate
 *               - durationHours
 *             properties:
 *               path:
 *                 type: string
 *                 description: The API path to override
 *                 example: "/api/compliments/random"
 *               maxRequests:
 *                 type: number
 *                 description: Maximum requests for non-authenticated users
 *                 example: 100
 *               authenticatedMaxRequests:
 *                 type: number
 *                 description: Maximum requests for authenticated users
 *                 example: 200
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: When the override should start
 *               durationHours:
 *                 type: number
 *                 description: Duration of the override in hours
 *                 example: 24
 *     responses:
 *       200:
 *         description: Override created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - User does not have admin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       409:
 *         description: Conflict with existing override
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConflictError'
 */
rateLimitOverridesRouter.post(
  '/',
  rateLimitOverrideController.createOverride.bind(rateLimitOverrideController),
);

/**
 * @swagger
 * /api/admin/rate-limits:
 *   delete:
 *     summary: Remove rate limit overrides
 *     description: Removes rate limit overrides for a specific path
 *     tags: [Rate Limit Overrides]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - path
 *             properties:
 *               path:
 *                 type: string
 *                 description: The API path to remove overrides for
 *                 example: "/api/compliments/random"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Only remove overrides starting from this date
 *                 example: "2024-01-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Only remove overrides ending on this date
 *                 example: "2024-12-31"
 *               createdByActiveUser:
 *                 type: boolean
 *                 description: Only remove overrides created by the current user
 *                 example: true
 *     responses:
 *       200:
 *         description: Overrides removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - User does not have admin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
rateLimitOverridesRouter.delete(
  '/',
  rateLimitOverrideController.removeOverride.bind(rateLimitOverrideController),
);

export default rateLimitOverridesRouter;
