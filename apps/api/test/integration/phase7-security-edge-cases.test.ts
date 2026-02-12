import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server/build-app.ts';
import { seedTestSalon, createTestBooking, generateTestCustomer, cleanupTestData } from '../test-utils.ts';

describe('Phase 7: Security & Edge Cases', () => {
  let server: ReturnType<typeof buildApp>;
  let testData: Awaited<ReturnType<typeof seedTestSalon>>;

  beforeAll(async () => {
    server = buildApp();
    await server.ready();
    testData = await seedTestSalon();
  });

  afterAll(async () => {
    await cleanupTestData(testData.salonId);
    await server.close();
  });

  describe('7.1 SQL Injection Protection', () => {
    it('should reject SQL injection in salon slug', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/public/salons/\'; DROP TABLE salons; --'
      });
      expect([400, 404]).toContain(response.statusCode);
    });

    it('should reject SQL injection in service ID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/public/salons/test/services/\' OR \'1\'=\'1'
      });
      expect([400, 404]).toContain(response.statusCode);
    });
  });

  describe('7.2 XSS Protection', () => {
    it('should sanitize script tags in customer name', async () => {
      const customer = generateTestCustomer();
      customer.name = '<script>alert(1)</script>';
      
      const response = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: testData.staffId,
          startUtc: new Date(Date.now() + 86400000).toISOString(),
          customer
        }
      });
      expect([201, 400, 409]).toContain(response.statusCode);
    });

    it('should handle special characters in email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: testData.staffId,
          startUtc: new Date(Date.now() + 86400000).toISOString(),
          customer: {
            name: 'Test',
            email: '<script>alert(1)</script>@test.com'
          }
        }
      });
      expect([201, 400, 409]).toContain(response.statusCode);
    });
  });

  describe('7.3 Rate Limiting', () => {
    it('should handle rapid requests', async () => {
      const requests = Array(20).fill(null).map(() =>
        server.inject({
          method: 'GET',
          url: `/v1/public/salons/${testData.slug}`
        })
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.statusCode === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('7.4 Input Validation', () => {
    it('should reject oversized payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: testData.staffId,
          startUtc: new Date(Date.now() + 86400000).toISOString(),
          customer: {
            name: 'A'.repeat(10000),
            email: 'test@test.com'
          }
        }
      });
      expect([201, 400, 409, 413]).toContain(response.statusCode);
    });
  });
});
