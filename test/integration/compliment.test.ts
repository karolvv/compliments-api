import {testRequest, createTestUser} from '../helpers';
import {HTTP_STATUS_CODES} from '@utils/constants';
import mongoose from 'mongoose';
import {RedisService} from '@configs/redis';

describe('Compliments Routes Integration Tests', () => {
  let userAccessToken: string;

  beforeEach(async () => {
    await RedisService.getInstance().getClient().flushall();
    await mongoose.connection.collections.users.deleteMany({});

    const {accessToken} = await createTestUser(
      'user@example.com',
      'regularuser',
      'userpass123',
    );
    userAccessToken = accessToken;
  });

  afterEach(async () => {
    await RedisService.getInstance().getClient().flushall();
    await mongoose.connection.collections.users.deleteMany({});
  });

  describe('GET /api/compliments', () => {
    it('should return compliments for authenticated user', async () => {
      const response = await testRequest
        .get('/api/compliments')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await testRequest.get('/api/compliments');

      expect(response.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    it('should return empty array when user has no compliments', async () => {
      const newUser = await createTestUser();
      const response = await testRequest
        .get('/api/compliments')
        .set('Authorization', `Bearer ${newUser.accessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(response.body.data).toEqual([]);
    });

    it('should properly paginate results and maintain order', async () => {
      // Create multiple compliments first
      const compliments = [];
      for (let i = 0; i < 15; i++) {
        const response = await testRequest
          .post('/api/compliments')
          .set('Authorization', `Bearer ${userAccessToken}`)
          .send({text: `Compliment ${i}`});
        compliments.push(response.body);
      }

      const response = await testRequest
        .get('/api/compliments?page=1&limit=10')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(response.body.data.length).toBe(10);
      expect(response.body.data[0].text).toBe('Compliment 14'); // Most recent should be the first item
      expect(response.body).toMatchObject({
        page: 1,
        totalPages: 2,
        total: 15,
        limit: 10,
      });
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await testRequest
        .get('/api/compliments?page=invalid&limit=wrong')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
    });
  });

  describe('POST /api/compliments', () => {
    it('should create new compliment for authenticated user', async () => {
      const response = await testRequest
        .post('/api/compliments')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          text: 'You are awesome!',
        });

      expect(response.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(response.body).toHaveProperty('text', 'You are awesome!');
    });

    it('should fail with empty text', async () => {
      const response = await testRequest
        .post('/api/compliments')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({text: ''});

      expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
    });

    it('should fail with text exceeding maximum length', async () => {
      const response = await testRequest
        .post('/api/compliments')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({text: 'a'.repeat(501)}); // Assuming 500 char limit

      expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
    });

    it('should sanitize HTML in compliment text', async () => {
      const response = await testRequest
        .post('/api/compliments')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({text: '<script>alert("xss")</script>Nice work!'});

      expect(response.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(response.body.text).toBe('Nice work!');
    });
  });

  describe('DELETE /api/compliments/:id', () => {
    it('should delete existing compliment', async () => {
      // Create a compliment first
      const createResponse = await testRequest
        .post('/api/compliments')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({_id: '517f1r77bdf86cd799439011', text: 'To be deleted'});

      const deleteResponse = await testRequest
        .delete(`/api/compliments/${createResponse.body._id}`)
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(deleteResponse.status).toBe(HTTP_STATUS_CODES.OK);

      // Verify it's deleted
      const getResponse = await testRequest
        .get(`/api/compliments/${createResponse.body._id}`)
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(getResponse.status).toBe(HTTP_STATUS_CODES.NOT_FOUND);
    });

    it('should fail to delete non-existent compliment', async () => {
      const response = await testRequest
        .delete('/api/compliments/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.NOT_FOUND);
    });

    it('should fail to delete without authentication', async () => {
      const createResponse = await testRequest
        .post('/api/compliments')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          _id: '517f1r77bdf86cd799439011',
          text: 'To be deleted',
        });

      const response = await testRequest.delete(
        `/api/compliments/${createResponse.body._id}`,
      );

      expect(response.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    it('should fail to delete with invalid id format', async () => {
      const response = await testRequest
        .delete('/api/compliments/invalid-id-format')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
    });

    it("should fail to delete another user's compliment", async () => {
      // Create another user
      const otherUser = await createTestUser(
        'other@example.com',
        'otheruser',
        'pass123',
      );

      // Create compliment as other user
      const createResponse = await testRequest
        .post('/api/compliments')
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .send({
          _id: '507f1f77bcf46cd799139012',
          text: "Other user's compliment",
        });

      // Try to delete with original user
      const deleteResponse = await testRequest
        .delete(`/api/compliments/${createResponse.body._id}`)
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(deleteResponse.status).toBe(HTTP_STATUS_CODES.FORBIDDEN);
    });
  });
});
