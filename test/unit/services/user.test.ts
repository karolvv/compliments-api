import {UserService} from '@services/user';
import {User} from '@models/user';
import {ConflictError, NotFoundError, ValidationError} from '@utils/errors';
import {Types} from 'mongoose';

jest.mock('@models/user');

describe('UserService', () => {
  let userService: UserService;
  const mockUser = {
    _id: new Types.ObjectId(),
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword123',
    createdAt: new Date(),
  };

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userService.getUserById(mockUser._id.toString());
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundError when user not found', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(userService.getUserById('nonexistentId')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('getUserByUsername', () => {
    it('should return user when found', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userService.getUserByUsername(mockUser.username);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundError when user not found', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        userService.getUserByUsername('nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [mockUser];
      const mockTotal = 1;

      (User.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockUsers),
      });
      (User.countDocuments as jest.Mock).mockResolvedValue(mockTotal);

      const result = await userService.getUsers({page: 1, limit: 10});

      expect(result).toEqual({
        page: 1,
        limit: 10,
        total: mockTotal,
        totalPages: 1,
        data: mockUsers,
      });
    });
  });

  describe('createUser', () => {
    const newUserData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
    };

    it('should create user when username and email are unique', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.prototype.save as jest.Mock).mockResolvedValue({
        ...newUserData,
        _id: new Types.ObjectId(),
        createdAt: expect.any(Date),
      });

      const result = await userService.createUser(newUserData);
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('createdAt');
    });

    it('should throw ConflictError when username or email exists', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(userService.createUser(newUserData)).rejects.toThrow(
        ConflictError,
      );
    });
  });

  describe('updateUser', () => {
    it('should update user when valid data provided', async () => {
      const updateData = {username: 'updateduser'};
      const updatedUser = {...mockUser, ...updateData};

      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedUser);

      const result = await userService.updateUser(
        mockUser._id.toString(),
        updateData,
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw ValidationError when no valid update fields provided', async () => {
      await expect(
        userService.updateUser(mockUser._id.toString(), {}),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when user not found', async () => {
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        userService.updateUser(mockUser._id.toString(), {username: 'test'}),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteUser', () => {
    it('should delete user when found', async () => {
      (User.findByIdAndDelete as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.deleteUser(mockUser._id.toString());
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundError when user not found', async () => {
      (User.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(userService.deleteUser('nonexistentId')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
