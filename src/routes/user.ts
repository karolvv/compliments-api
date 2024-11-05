import {Router} from 'express';
import {UserController} from '@controllers/user';
import {UserService} from '@services/user';
import {USER_ROLES} from '@utils/constants';
import {authorizationMiddleware} from '@middlewares/authorization';

const userRouter = Router();
const userService = new UserService();
const userController = new UserController(userService);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserUpdateInput:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           description: The new username of the user
 *           example: "john_doe"
 *         email:
 *           type: string
 *           description: The new email of the user
 *           example: "john.doe@example.com"
 *         password:
 *           type: string
 *           description: The new password of the user
 *           example: "password123"
 */

/**
 * @swagger
 * /api/users/user/{username}:
 *   get:
 *     summary: Get a user by username
 *     description: Retrieve user details using their unique username
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         description: Username of the user to retrieve
 *         required: true
 *         schema:
 *           type: string
 *         example: "john_doe"
 *     responses:
 *       200:
 *         description: User found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Server error
 */
userRouter.get(
  '/user/:username',
  userController.getUserByUsername.bind(userController),
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Retrieve user details using their unique ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         description: Unique identifier of the user
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: User found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 */
userRouter.get('/:id', userController.getUserById.bind(userController));

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users with pagination
 *     description: Retrieve a paginated list of users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Page number for pagination
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         description: Number of users per page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
userRouter.get('/', userController.getUsers.bind(userController));

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user by ID
 *     description: Updates user details using their unique ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateInput'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 */
userRouter.put('/:id', userController.updateUser.bind(userController));

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user by ID
 *     description: Deletes a user from the system.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 */
userRouter.delete(
  '/:id',
  authorizationMiddleware([USER_ROLES.ADMIN]),
  userController.deleteUser.bind(userController),
);

export default userRouter;
