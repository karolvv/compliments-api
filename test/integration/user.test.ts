import {testRequest, createTestUser, loginTestUser} from '../helpers';
import {User} from '@models/user';
import {Types} from 'mongoose';
import {HTTP_STATUS_CODES, USER_ROLES} from '@utils/constants';

describe('User Routes Integration Tests', () => {
  let accessToken: string;
  let userId: string;
  let adminAccessToken: string;

  beforeEach(async () => {
    // Create a regular test user
    const {user, accessToken: userToken} = await createTestUser(
      'test@example.com',
      'testuser',
      'password123',
    );
    accessToken = userToken;
    userId = user.id;

    // Create an admin user
    await createTestUser('admin@example.com', 'adminuser', 'password123');
    // Update admin user roles
    await User.findOneAndUpdate(
      {username: 'adminuser'},
      {roles: [USER_ROLES.ADMIN]},
    );

    adminAccessToken = await loginTestUser('admin@example.com', 'password123');
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID', async () => {
      const response = await testRequest
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(response.body).toMatchObject({
        username: 'testuser',
        email: 'test@example.com',
      });
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('refreshToken');
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await testRequest
        .get(`/api/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.NOT_FOUND);
      expect(response.body).toHaveProperty('message', 'User not found');
    });

    it('should return 400 for invalid user ID format', async () => {
      const response = await testRequest
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(response.body).toHaveProperty(
        'message',
        'Validation Error: Invalid user ID',
      );
    });
  });

  describe('GET /api/users/user/:username', () => {
    it('should get user by username', async () => {
      const response = await testRequest
        .get('/api/users/user/testuser')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(response.body).toMatchObject({
        username: 'testuser',
        email: 'test@example.com',
      });
    });

    it('should return 404 for non-existent username', async () => {
      const response = await testRequest
        .get('/api/users/user/nonexistentuser')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.NOT_FOUND);
      expect(response.body).toHaveProperty('message', 'User not found');
    });
  });

  describe('GET /api/users', () => {
    it('should get paginated users with default pagination', async () => {
      const response = await testRequest
        .get('/api/users')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it('should get paginated users with custom pagination', async () => {
      const response = await testRequest
        .get('/api/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(response.body).toMatchObject({
        page: 1,
        limit: 5,
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await testRequest
        .get('/api/users?page=0&limit=0')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user details', async () => {
      const updateData = {
        username: 'updateduser',
        email: 'updated@example.com',
      };

      const response = await testRequest
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(response.body).toMatchObject(updateData);
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await testRequest
        .put(`/api/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({username: 'newname'});

      expect(response.status).toBe(HTTP_STATUS_CODES.NOT_FOUND);
      expect(response.body).toHaveProperty('message', 'User not found');
    });

    it('should return 400 when no update data is provided', async () => {
      const response = await testRequest
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(response.body).toHaveProperty(
        'message',
        'Validation Error: No fields to update',
      );
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should allow admin to delete user', async () => {
      const response = await testRequest
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      console.log(adminAccessToken);
      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(response.body).toHaveProperty(
        'message',
        'User deleted successfully',
      );

      // Verify user is actually deleted
      const deletedUser = await User.findById(userId);
      expect(deletedUser).toBeNull();
    });

    it('should not allow non-admin to delete user', async () => {
      const response = await testRequest
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const response = await testRequest
        .delete(`/api/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.NOT_FOUND);
      expect(response.body).toHaveProperty('message', 'User not found');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        {
          method: (path: string) => testRequest.get(path),
          path: `/api/users/${userId}`,
        },
        {
          method: (path: string) => testRequest.get(path),
          path: '/api/users/user/testuser',
        },
        {method: (path: string) => testRequest.get(path), path: '/api/users'},
        {
          method: (path: string) => testRequest.put(path),
          path: `/api/users/${userId}`,
        },
        {
          method: (path: string) => testRequest.delete(path),
          path: `/api/users/${userId}`,
        },
      ];

      for (const endpoint of endpoints) {
        const response = await endpoint.method(endpoint.path);
        expect(response.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
      }
    });
  });
});
