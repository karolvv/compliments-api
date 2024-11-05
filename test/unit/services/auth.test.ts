import {AuthenticationService} from '@services/auth';
import {User} from '@models/user';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {UnauthorizedError} from '@utils/errors';
import {USER_ROLES} from '@utils/constants';

jest.mock('@models/user');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  const mockUser = {
    id: 'user123',
    _id: 'user123',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedPassword123',
    roles: [USER_ROLES.USER],
    save: jest.fn(),
  };

  beforeEach(() => {
    authService = new AuthenticationService();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login a user with valid credentials', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toEqual({
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when user is not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login('nonexistent@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when password is invalid', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const result = await authService.register(
        'test@example.com',
        'testuser',
        'password123',
      );

      expect(result).toEqual({
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
      expect(User.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword123',
        roles: [USER_ROLES.USER],
      });
    });

    it('should throw error when user already exists', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        authService.register('test@example.com', 'testuser', 'password123'),
      ).rejects.toThrow('User already exists');
    });
  });

  describe('refresh', () => {
    it('should successfully refresh tokens', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({id: 'user123'});
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await authService.refresh('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when no refresh token is provided', async () => {
      await expect(authService.refresh('')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when user is not found', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({id: 'user123'});
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(authService.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      await authService.logout('valid-refresh-token');

      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        {refreshToken: 'valid-refresh-token'},
        {$unset: {refreshToken: 1}},
      );
    });

    it('should not throw when refresh token is empty', async () => {
      await expect(authService.logout('')).resolves.not.toThrow();
    });
  });
});
