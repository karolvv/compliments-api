import {testRequest, createTestUser} from '../helpers';
import {HTTP_STATUS_CODES} from '@utils/constants';

describe('Authentication Routes Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await testRequest.post('/api/auth/register').send({
        email: 'auth.new@example.com',
        username: 'auth.newuser',
        password: 'auth.password123',
      });

      expect(response.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should not register user with existing email', async () => {
      const testEmail = 'auth.existing@example.com';
      await createTestUser(testEmail, 'auth.existinguser', 'auth.password123');

      const response = await testRequest.post('/api/auth/register').send({
        email: testEmail,
        username: 'auth.newuser',
        password: 'auth.password123',
      });

      expect(response.status).toBe(HTTP_STATUS_CODES.CONFLICT);
      expect(response.body).toHaveProperty('message');
    });

    it('should not register user with invalid email format', async () => {
      const response = await testRequest.post('/api/auth/register').send({
        email: 'invalid-email',
        username: 'auth.newuser',
        password: 'auth.password123',
      });

      expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(response.body).toHaveProperty('message');
    });

    it('should not register user with short password', async () => {
      const response = await testRequest.post('/api/auth/register').send({
        email: 'new@example.com',
        username: 'auth.newuser',
        password: 'auth.p',
      });

      expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    const testEmail = 'auth.test@example.com';
    const testPassword = 'auth.password123';

    beforeEach(async () => {
      await createTestUser(testEmail, 'auth.testuser', testPassword);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await testRequest.post('/api/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should fail with incorrect password', async () => {
      const response = await testRequest.post('/api/auth/login').send({
        email: testEmail,
        password: 'auth.wrongpassword',
      });

      expect(response.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    it('should fail with non-existent email', async () => {
      const response = await testRequest.post('/api/auth/login').send({
        email: 'auth.nonexistent@example.com',
        password: testPassword,
      });

      expect(response.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
      expect(response.body).toHaveProperty('message');
    });

    it('should fail with missing credentials', async () => {
      const response = await testRequest.post('/api/auth/login').send({});

      expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(response.body).toHaveProperty('message');
    });
  });
});
