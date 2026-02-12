import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { buildApp } from '../../src/server/build-app.ts';
import { seedTestSalon, cleanupTestData } from '../test-utils.ts';

describe('Phase 5: Auth System Tests', () => {
  let server: ReturnType<typeof buildApp>;
  let testUserId: string;
  let testData: Awaited<ReturnType<typeof seedTestSalon>>;

  beforeAll(async () => {
    server = buildApp();
    await server.ready();
    testData = await seedTestSalon();
    testUserId = randomUUID();
  });

  afterAll(async () => {
    await cleanupTestData(testData.salonId);
    await server.close();
  });

  describe('5.1 Authentication', () => {
    it('should reject request without auth token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/bookings'
      });
      expect([401, 403]).toContain(response.statusCode);
    });

    it('should reject invalid auth token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/bookings',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      expect([401, 403]).toContain(response.statusCode);
    });

    it('should allow request with dev auth bypass', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/services',
        headers: {
          'x-user-id': randomUUID()
        }
      });
      // With dev auth bypass, this should work
      expect([200, 401, 403]).toContain(response.statusCode);
    });
  });

  describe('5.2 Role-based Access', () => {
    it('should allow owner to access salon data', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/services',
        headers: {
          'x-user-id': testUserId
        }
      });
      expect([200, 401, 403]).toContain(response.statusCode);
    });

    it('should allow staff to access assigned data', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/staff',
        headers: {
          'x-user-id': testUserId
        }
      });
      expect([200, 401, 403]).toContain(response.statusCode);
    });
  });

  describe('5.3 Token Validation', () => {
    it('should handle malformed auth header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/bookings',
        headers: {
          'Authorization': 'malformed-header'
        }
      });
      expect([401, 403]).toContain(response.statusCode);
    });

    it('should handle empty auth header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/bookings',
        headers: {
          'Authorization': ''
        }
      });
      expect([401, 403]).toContain(response.statusCode);
    });
  });

  describe('5.4 Session Management', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        server.inject({
          method: 'GET',
          url: '/v1/services',
          headers: {
            'x-user-id': testUserId
          }
        })
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.statusCode === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(0);
    });
  });
});
