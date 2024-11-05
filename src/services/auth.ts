import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_SIGN_OPTIONS,
  JWT_REFRESH_EXPIRES_IN,
} from '@configs/auth';
import {User} from '@models/user';
import {UserDocument} from '@app/types/user';
import {ConflictError, UnauthorizedError} from '@utils/errors';
import logger from '@utils/logger';
import {USER_ROLES} from '@utils/constants';
import {TokenContext} from '@app/types/shared';

export class AuthenticationService {
  private generateTokens(user: UserDocument) {
    logger.debug('Token generation details:', {
      secretFirstChars: JWT_SECRET.substring(0, 5),
      secretLength: JWT_SECRET.length,
      signOptions: JWT_SIGN_OPTIONS,
    });

    const tokenContext: TokenContext = {
      userInfo: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    };
    const accessToken = jwt.sign(tokenContext, JWT_SECRET, JWT_SIGN_OPTIONS);

    return {
      accessToken,
      refreshToken: jwt.sign({id: user._id}, JWT_REFRESH_SECRET, {
        ...JWT_SIGN_OPTIONS,
        expiresIn: JWT_REFRESH_EXPIRES_IN,
      }),
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{
    user: UserDocument;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await User.findOne({email});
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokens = this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {user, ...tokens};
  }

  async register(
    email: string,
    username: string,
    password: string,
  ): Promise<{
    user: UserDocument;
    accessToken: string;
    refreshToken: string;
  }> {
    const existingUser = await User.findOne({email});
    if (existingUser) {
      throw new ConflictError('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      roles: [USER_ROLES.USER],
    });

    const tokens = this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {user, ...tokens};
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token provided');
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      id: string;
    };

    const user = await User.findOne({
      _id: decoded.id,
      refreshToken,
    });

    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokens = this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return tokens;
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await User.findOneAndUpdate({refreshToken}, {$unset: {refreshToken: 1}});
    }
  }
}
