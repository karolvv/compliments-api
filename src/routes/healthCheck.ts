import {HTTP_STATUS_CODES} from '@utils/constants';
import {Router, Request, Response} from 'express';

const healthCheckRouter = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API health status
 *     description: Returns the health status of the API
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 */
healthCheckRouter.get('/', (req: Request, res: Response) => {
  res.status(HTTP_STATUS_CODES.OK).json({status: 'UP'});
});

export default healthCheckRouter;
