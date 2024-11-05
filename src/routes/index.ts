import {Router} from 'express';
import authRouter from './auth';
import complimentRouter from './compliment';
import healthCheckRouter from './healthCheck';
import userRouter from './user';
import rateLimitOverridesRouter from './rateLimitOverride';
import {USER_ROLES} from '@utils/constants';
import {authorizationMiddleware} from '@middlewares/authorization';

const router = Router();
const adminRouter = Router();

// Admin routes
adminRouter.use('/rate-limits', rateLimitOverridesRouter);

// All routes
router.use('/auth', authRouter);
router.use('/compliments', complimentRouter);
router.use('/health', healthCheckRouter);
router.use('/users', userRouter);
router.use('/admin', authorizationMiddleware([USER_ROLES.ADMIN]), adminRouter);

export {router, adminRouter};
