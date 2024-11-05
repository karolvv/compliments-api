import {Router} from 'express';
import {ComplimentController} from '@controllers/compliment';
import {ComplimentService} from '@services/compliment';

const complimentRouter = Router();
const complimentService = new ComplimentService();
const complimentController = new ComplimentController(complimentService);

/**
 * @swagger
 * tags:
 *   name: Compliments
 *   description: API endpoints for managing compliments
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ComplimentInput:
 *       type: object
 *       required:
 *         - text
 *       properties:
 *         text:
 *           type: string
 *           minLength: 1
 *           description: The compliment text
 *           example: "You have a wonderful smile!"
 */

/**
 * @swagger
 * /api/compliments/random:
 *   get:
 *     summary: Get a random compliment
 *     description: Retrieves a randomly selected compliment from the database.
 *     tags: [Compliments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A random compliment was successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Compliment'
 *       404:
 *         description: No compliments found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
complimentRouter.get(
  '/random',
  complimentController.getRandomCompliment.bind(complimentController),
);

/**
 * @swagger
 * /api/compliments/{id}:
 *   get:
 *     summary: Get a compliment by ID
 *     description: Retrieves a compliment by its unique identifier.
 *     tags: [Compliments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Compliment ID
 *     responses:
 *       200:
 *         description: Returns the compliment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Compliment'
 *       404:
 *         description: Compliment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
complimentRouter.get(
  '/:id',
  complimentController.getComplimentById.bind(complimentController),
);

/**
 * @swagger
 * /api/compliments:
 *   get:
 *     summary: Get all compliments with pagination
 *     description: Retrieves a paginated list of compliments that can be filtered and sorted.
 *     tags: [Compliments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: The page number for pagination (starts from 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: The number of items to return per page
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of compliments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Compliment'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of compliments
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                     limit:
 *                       type: integer
 *                       description: Number of items per page
 *                     pages:
 *                       type: integer
 *                       description: Total number of pages
 *             example:
 *               data: [
 *                 {
 *                   id: "123",
 *                   text: "You have a wonderful smile!",
 *                   category: "appearance",
 *                   createdAt: "2024-03-20T10:00:00Z"
 *                 }
 *               ]
 *               pagination: {
 *                 total: 100,
 *                 page: 1,
 *                 limit: 10,
 *                 pages: 10
 *               }
 *       500:
 *         description: Internal server error occurred
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
complimentRouter.get(
  '/',
  complimentController.getCompliments.bind(complimentController),
);

/**
 * @swagger
 * /api/compliments:
 *   post:
 *     summary: Create a new compliment
 *     tags: [Compliments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ComplimentInput'
 *     responses:
 *       201:
 *         description: Compliment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Compliment'
 *       400:
 *         description: Invalid input or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
complimentRouter.post(
  '/',
  complimentController.createCompliment.bind(complimentController),
);

/**
 * @swagger
 * /api/compliments/{id}:
 *   put:
 *     summary: Update a compliment by ID
 *     tags: [Compliments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Compliment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ComplimentInput'
 *     responses:
 *       200:
 *         description: Compliment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Compliment'
 *       404:
 *         description: Compliment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
complimentRouter.put(
  '/:id',
  complimentController.updateCompliment.bind(complimentController),
);

/**
 * @swagger
 * /api/compliments/{id}:
 *   delete:
 *     summary: Delete a compliment by ID
 *     tags: [Compliments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Compliment ID
 *     responses:
 *       200:
 *         description: Compliment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Compliment deleted successfully"
 *       401:
 *         description: Unauthorized - User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - User is not the author of the compliment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       404:
 *         description: Compliment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
complimentRouter.delete(
  '/:id',
  complimentController.deleteCompliment.bind(complimentController),
);

export default complimentRouter;
