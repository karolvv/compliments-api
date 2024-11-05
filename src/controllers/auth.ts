import {Request, Response, NextFunction} from 'express';
import {AuthenticationService} from '@services/auth';
import {HTTP_STATUS_CODES, TIME_IN_MS} from '@utils/constants';
import z from 'zod';
import {BadRequestError} from '@utils/errors';

export class AuthenticationController {
  private authService: AuthenticationService;

  constructor(authService: AuthenticationService) {
    this.authService = authService;
  }

  public login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // VALIDATION
      const bodySchema = z.object({
        email: z
          .string()
          .email('Invalid email address')
          .transform(
            text => text.replace(/<[^>]*>.*?<\/[^>]*>/g, ''), // Removes HTML tags and everything in between them
          ),
        password: z
          .string()
          .min(8, 'Password must be at least 8 characters long'),
      });

      const {email, password} = bodySchema.parse(req.body);

      // LOGIC
      const result = await this.authService.login(email, password);

      // RESPONSE
      // Set the refresh token cookie
      this.setRefreshTokenCookie(res, result.refreshToken);
      // Send the access token in the response
      res.json({accessToken: result.accessToken});
      return;
    } catch (error) {
      next(error);
    }
  };

  public register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // VALIDATION
      const bodySchema = z.object({
        username: z
          .string()
          .min(1, 'Username must not be empty')
          .transform(
            text => text.replace(/<[^>]*>.*?<\/[^>]*>/g, ''), // Removes HTML tags and everything in between them
          ),
        email: z
          .string()
          .email('Invalid email address')
          .transform(
            text => text.replace(/<[^>]*>.*?<\/[^>]*>/g, ''), // Removes HTML tags and everything in between them
          ),
        password: z
          .string()
          .min(8, 'Password must be at least 8 characters long'),
      });

      const {username, email, password} = bodySchema.parse(req.body);

      // LOGIC
      // Register the user
      const result = await this.authService.register(email, username, password);

      // RESPONSE
      // Set the refresh token cookie
      this.setRefreshTokenCookie(res, result.refreshToken);
      // Send the access token in the response
      res
        .status(HTTP_STATUS_CODES.CREATED)
        .json({accessToken: result.accessToken});
      return;
    } catch (error) {
      next(error);
    }
  };

  public refresh = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {refreshToken} = req.cookies;

      if (!refreshToken) {
        throw new BadRequestError('No refresh token provided');
      }

      const result = await this.authService.refresh(refreshToken);

      // RESPONSE
      // Set the refresh token cookie
      this.setRefreshTokenCookie(res, result.refreshToken);
      // Send the access token in the response
      res.json({accessToken: result.accessToken});
    } catch (error) {
      next(error);
    }
  };

  public logout = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // LOGIC
      const {refreshToken} = req.cookies;

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      // RESPONSE
      // Clear the refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
      });
      // Send a success message
      res
        .status(HTTP_STATUS_CODES.NO_CONTENT)
        .json({message: 'Logged out successfully'});
      return;
    } catch (error) {
      next(error);
    }
  };

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TIME_IN_MS.SEVEN_DAYS,
      path: '/api/auth',
    });
  }
}
