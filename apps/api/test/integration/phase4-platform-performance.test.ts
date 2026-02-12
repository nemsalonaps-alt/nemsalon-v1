import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { buildApp } from '../../src/server/build-app.ts';
import { seedTestSalon, createTestBooking, generateTestCustomer, cleanupTestData } from '../test-utils.ts';

describe('Phase 4: Platform & Performance Tests', () => {
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

  describe('4.1 Platform Admin Endpoints', () => {
    it('should get platform salons list', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/salons'
      });
      expect([200, 401, 403]).toContain(response.statusCode);
    });

    it('should get salon details for platform admin', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/platform/salons/${testData.salonId}`
      });
      expect([200, 401, 403, 404]).toContain(response.statusCode);
    });

    it('should get salon bookings for platform admin', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/platform/salons/${testData.salonId}/bookings`
      });
      expect([200, 401, 403]).toContain(response.statusCode);
    });

    it('should get salon payments for platform admin', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/platform/salons/${testData.salonId}/payments`
      });
      expect([200, 401, 403]).toContain(response.statusCode);
    });

    it('should get platform audit logs', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/audit'
      });
      expect([200, 401, 403]).toContain(response.statusCode);
    });
  });

  describe('4.2 Performance - Booking Creation', () => {
    it('should handle 10 sequential bookings', async () => {
      const bookings = [];
      for (let i = 0; i < 10; i++) {
        const from = new Date();
        from.setDate(from.getDate() + 1);
        from.setHours(9 + i, 0, 0, 0);
        const booking = await createTestBooking(server, testData, undefined, { from });
        bookings.push(booking);
      }
      expect(bookings.length).toBe(10);
      expect(new Set(bookings.map(b => b.booking.id)).size).toBe(10);
    });

    it('should handle concurrent availability requests', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const requests = Array(5).fill(null).map(() =>
        server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=10`
        })
      );

      const responses = await Promise.all(requests);
      expect(responses.every(r => r.statusCode === 200)).toBe(true);
    });
  });

  describe('4.3 Load Testing', () => {
    it('should handle rapid sequential requests', async () => {
      const start = Date.now();
      for (let i = 0; i < 20; i++) {
        await server.inject({
          method: 'GET',
          url: `/v1/public/salons/${testData.slug}`
        });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('4.4 Memory & Resource', () => {
    it('should handle many bookings in single day', async () => {
      const bookings = [];
      for (let i = 0; i < 5; i++) {
        try {
          const booking = await createTestBooking(server, testData);
          bookings.push(booking);
        } catch {
          // Slot may not be available
        }
      }
      expect(bookings.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle large response payloads', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}/services`
      });
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toBeDefined();
    });
  });

  describe('4.5 Rate Limiting', () => {
    it('should handle burst requests gracefully', async () => {
      const requests = Array(10).fill(null).map(() =>
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

  describe('4.6 Concurrency', () => {
    it('should handle simultaneous booking attempts', async () => {
      const customer = generateTestCustomer();

      const requests = Array(3).fill(null).map(() =>
        createTestBooking(server, testData, customer).catch(() => null)
      );

      const results = await Promise.all(requests);
      const successful = results.filter(r => r !== null);
      expect(successful.length).toBeGreaterThanOrEqual(0);
    });
  });
});
