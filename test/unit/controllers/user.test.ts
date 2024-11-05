import {UserController} from '@controllers/user';
import {UserService} from '@services/user';
import {ValidationError} from '@utils/errors';
import {Request, Response, NextFunction} from 'express';

// Mock UserService
jest.mock('@services/user');

describe('UserController', () => {
  let userController: UserController;
  let userService: jest.Mocked<UserService>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    userService = new UserService() as jest.Mocked<UserService>;
    userController = new UserController(userService);

    // Setup request and response objects
    req = {
      params: {},
      query: {},
      body: {},
    };
    res = {
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('getUserById', () => {
    it('should return a user when given a valid ID', async () => {
      const mockUser = {id: '507f1f77bcf86cd799439011', name: 'Test User'};
      req.params = {id: '507f1f77bcf86cd799439011'};
      userService.getUserById = jest.fn().mockResolvedValue(mockUser);

      await userController.getUserById(req as Request, res as Response, next);

      expect(userService.getUserById).toHaveBeenCalledWith(req.params.id);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ValidationError for invalid ID', async () => {
      req.params = {id: 'invalid-id'};

      await userController.getUserById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('getUserByUsername', () => {
    it('should return a user when given a valid username', async () => {
      const mockUser = {username: 'testuser', name: 'Test User'};
      req.params = {username: 'testuser'};
      userService.getUserByUsername = jest.fn().mockResolvedValue(mockUser);

      await userController.getUserByUsername(
        req as Request,
        res as Response,
        next,
      );

      expect(userService.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ValidationError for empty username', async () => {
      req.params = {username: ''};

      await userController.getUserByUsername(
        req as Request,
        res as Response,
        next,
      );

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getUsers', () => {
    it('should return paginated users with default values', async () => {
      const mockResult = {
        users: [],
        total: 0,
        page: 1,
        limit: 10,
      };
      userService.getUsers = jest.fn().mockResolvedValue(mockResult);

      await userController.getUsers(req as Request, res as Response, next);

      expect(userService.getUsers).toHaveBeenCalledWith({page: 1, limit: 10});
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return paginated users with custom values', async () => {
      req.query = {page: '2', limit: '20'};
      const mockResult = {
        users: [],
        total: 0,
        page: 2,
        limit: 20,
      };
      userService.getUsers = jest.fn().mockResolvedValue(mockResult);

      await userController.getUsers(req as Request, res as Response, next);

      expect(userService.getUsers).toHaveBeenCalledWith({page: 2, limit: 20});
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('updateUser', () => {
    it('should update and return user when given valid data', async () => {
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        username: 'updated.user',
        email: 'updated.user@example.com',
        password: 'updated.password',
      };
      req.params = {id: '507f1f77bcf86cd799439011'};
      req.body = {username: 'updated.user'};

      userService.getUserById = jest.fn().mockResolvedValue(mockUser);
      userService.updateUser = jest.fn().mockResolvedValue(mockUser);

      await userController.updateUser(req as Request, res as Response, next);

      expect(userService.updateUser).toHaveBeenCalledWith(
        req.params.id,
        req.body,
      );
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ValidationError when ID is missing', async () => {
      await userController.updateUser(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('deleteUser', () => {
    it('should delete user and return success message', async () => {
      req.params = {id: '507f1f77bcf86cd799439011'};
      userService.deleteUser = jest.fn().mockResolvedValue(undefined);

      await userController.deleteUser(req as Request, res as Response, next);

      expect(userService.deleteUser).toHaveBeenCalledWith(req.params.id);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User deleted successfully',
      });
    });

    it('should pass error to next middleware when deletion fails', async () => {
      req.params = {id: '507f1f77bcf86cd799439011'};
      const error = new Error('Deletion failed');
      userService.deleteUser = jest.fn().mockRejectedValue(error);

      await userController.deleteUser(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
