import {app} from '../src/index';
import request from 'supertest';
import {AuthenticationService} from '@services/auth';

export const testRequest = request(app);

export const authService = new AuthenticationService();

export async function createTestUser(
  email = 'test@example.com',
  username = 'testuser',
  password = 'password123',
) {
  const {user, accessToken} = await authService.register(
    email,
    username,
    password,
  );
  return {user, accessToken};
}

export async function loginTestUser(email: string, password: string) {
  const {accessToken} = await authService.login(email, password);
  return accessToken;
}
