import {ConflictError, NotFoundError, ValidationError} from '@utils/errors';
import {PaginatedResponse} from '@app/types/shared';
import {Types} from 'mongoose';
import {User} from '@models/user';
import {UserDocument} from '@app/types/user';

export class UserService {
  async getUserById(id: string): Promise<UserDocument | null> {
    const user = await User.findById(id).exec();
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async getUserByUsername(username: string): Promise<UserDocument | null> {
    const user = await User.findOne({username}).exec();
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async getUsers({
    page,
    limit,
  }: {
    page: number;
    limit: number;
  }): Promise<PaginatedResponse<UserDocument>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      User.find().skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async createUser(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<UserDocument> {
    const existingUser = await User.findOne({
      $or: [{username: userData.username}, {email: userData.email}],
    });

    if (existingUser) {
      throw new ConflictError(
        'User already exists with this username or email',
      );
    }

    const newUser = new User(userData);
    newUser._id = new Types.ObjectId();
    newUser.createdAt = new Date();
    return await newUser.save();
  }

  async updateUser(
    userId: string,
    updateData: Partial<UserDocument>,
  ): Promise<UserDocument> {
    const {username, email, password} = updateData;
    if (!username && !email && !password) {
      throw new ValidationError('No fields to update');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...updateData,
        $inc: {__v: 1},
      },
      {new: true, runValidators: true},
    );

    if (!updatedUser) {
      throw new NotFoundError('User');
    }

    return updatedUser;
  }

  async deleteUser(userId: string): Promise<UserDocument | null> {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      throw new NotFoundError('User');
    }
    return deletedUser;
  }
}
