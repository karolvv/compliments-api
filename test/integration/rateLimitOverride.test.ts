import {testRequest, createTestUser, loginTestUser} from '../helpers';
import {HTTP_STATUS_CODES, USER_ROLES} from '@utils/constants';
import {User} from '@models/user';
import {RateLimitOverride} from '@models/rateLimitOverride';

describe('Rate Limit Override Routes Integration Tests', () => {
  let adminAccessToken: string;
  let userAccessToken: string;
  const testPath = '/api/test-path';

  beforeEach(async () => {
    // Create admin user
    await createTestUser('admin@example.com', 'adminuser', 'password123');
    // Update admin user roles
    await User.findOneAndUpdate(
      {username: 'adminuser'},
      {roles: [USER_ROLES.ADMIN]},
    );

    adminAccessToken = await loginTestUser('admin@example.com', 'password123');

    // Create regular user
    const {accessToken} = await createTestUser(
      'user@example.com',
      'regularuser',
      'userpass123',
    );
    userAccessToken = accessToken;
  });

  afterEach(async () => {
    await RateLimitOverride.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /api/admin/rate-limits', () => {
    it('should return recent overrides when authenticated as admin', async () => {
      const response = await testRequest
        .get('/api/admin/rate-limits')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return filtered overrides when path is provided', async () => {
      // Create a test override first
      const override = new RateLimitOverride({
        path: testPath,
        windowMs: 3600000,
        maxRequests: 100,
        authenticatedMaxRequests: 200,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });
      await override.save();

      const response = await testRequest
        .get(`/api/admin/rate-limits?path=${testPath}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].path).toBe(testPath);
    });

    it('should return 403 when not authenticated as admin', async () => {
      const response = await testRequest
        .get('/api/admin/rate-limits')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.FORBIDDEN);
    });
  });

  describe('GET /api/admin/rate-limits/active', () => {
    it('should return active overrides', async () => {
      // Create an active override
      const override = new RateLimitOverride({
        path: testPath,
        windowMs: 3600000,
        maxRequests: 100,
        authenticatedMaxRequests: 200,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });
      await override.save();

      const response = await testRequest
        .get('/api/admin/rate-limits/active')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/admin/rate-limits', () => {
    const validOverride = {
      path: testPath,
      maxRequests: 100,
      authenticatedMaxRequests: 200,
      startDate: new Date().toISOString(),
      durationHours: 24,
    };

    it('should create a new override when valid data is provided', async () => {
      const response = await testRequest
        .post('/api/admin/rate-limits')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(validOverride);

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(response.body).toEqual({
        success: true,
        message: 'Rate limit override configured',
      });

      // Verify override was created in database
      const savedOverride = await RateLimitOverride.findOne({path: testPath});
      expect(savedOverride).toBeTruthy();
      expect(savedOverride?.path).toBe(testPath);
    });

    it('should reject invalid override data', async () => {
      const invalidOverride = {
        ...validOverride,
        maxRequests: -1, // Invalid: must be positive
      };

      const response = await testRequest
        .post('/api/admin/rate-limits')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(invalidOverride);

      expect(response.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
    });

    it('should prevent overlapping overrides', async () => {
      // Create initial override
      await testRequest
        .post('/api/admin/rate-limits')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(validOverride);

      // Attempt to create overlapping override
      const response = await testRequest
        .post('/api/admin/rate-limits')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(validOverride);

      expect(response.status).toBe(HTTP_STATUS_CODES.CONFLICT);
    });
  });

  describe('DELETE /api/admin/rate-limits', () => {
    it('should remove existing override', async () => {
      // Create an override first
      const override = new RateLimitOverride({
        path: testPath,
        windowMs: 3600000,
        maxRequests: 100,
        authenticatedMaxRequests: 200,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });
      await override.save();

      const response = await testRequest
        .delete('/api/admin/rate-limits')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({path: testPath});

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
      expect(response.body).toEqual({
        success: true,
        message: 'Rate limit override removed',
      });

      // Verify override was removed
      const deletedOverride = await RateLimitOverride.findOne({path: testPath});
      expect(deletedOverride).toBeNull();
    });

    it('should handle removal with date range', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 3600000);

      const response = await testRequest
        .delete('/api/admin/rate-limits')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          path: testPath,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
    });

    it('should handle removal of overrides created by current user', async () => {
      const response = await testRequest
        .delete('/api/admin/rate-limits')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          path: testPath,
          createdByActiveUser: true,
        });

      expect(response.status).toBe(HTTP_STATUS_CODES.OK);
    });
  });
});
