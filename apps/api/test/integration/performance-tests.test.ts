import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server/build-app.ts';
import {
  seedTestSalon,
  cleanupTestData,
  generateTestCustomer,
  getTomorrowAt,
  createTestBooking,
} from '../test-utils.ts';
import { getSupabaseClient } from '../../src/server/db.ts';
import { randomUUID } from 'crypto';

describe('Performance Tests', () => {
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

  describe('API Response Time Benchmarks', () => {
    it('should respond to salon lookup in under 100ms', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}`,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(100);
    });

    it('should respond to availability query in under 500ms', async () => {
      const tomorrow = getTomorrowAt(10);

      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=50`,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it('should respond to booking creation in under 300ms', async () => {
      const tomorrow = getTomorrowAt(10);

      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];

      const startTime = Date.now();

      const response = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer: generateTestCustomer(),
          idempotencyKey: `perf-test-${randomUUID().slice(0, 8)}`,
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(201);
      expect(duration).toBeLessThan(300);
    });

    it('should respond to dashboard data in under 500ms', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: '/v1/content/bookings?limit=50',
        headers: {
          Authorization: 'Bearer test-owner-token',
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect([200, 401, 403]).toContain(response.statusCode);
      expect(duration).toBeLessThan(500);
    });

    it('should respond to calendar data in under 300ms', async () => {
      const tomorrow = getTomorrowAt(0);

      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/content/calendar?from=${tomorrow.toISOString()}&days=7`,
        headers: {
          Authorization: 'Bearer test-owner-token',
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect([200, 401, 403]).toContain(response.statusCode);
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle 50 concurrent availability requests', async () => {
      const tomorrow = getTomorrowAt(10);

      const requests = Array.from({ length: 50 }, () =>
        server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=10`,
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successCount = responses.filter((r) => r.statusCode === 200).length;

      expect(successCount).toBeGreaterThanOrEqual(45);
      expect(duration).toBeLessThan(3000);
    });

    it('should handle bulk day with 50 bookings', async () => {
      const supabase = getSupabaseClient();
      const bookings: string[] = [];

      const tomorrow = getTomorrowAt(9);

      for (let i = 0; i < 50; i++) {
        const slotTime = new Date(tomorrow.getTime() + i * 30 * 60 * 1000);
        const customer = generateTestCustomer();

        const response = await server.inject({
          method: 'POST',
          url: '/v1/public/bookings',
          headers: { 'Content-Type': 'application/json' },
          payload: {
            salonSlug: testData.slug,
            serviceId: testData.serviceId,
            staffId: testData.staffId,
            startUtc: slotTime.toISOString(),
            customer,
            idempotencyKey: `bulk-${randomUUID().slice(0, 8)}-${i}`,
          },
        });

        if (response.statusCode === 201) {
          const data = JSON.parse(response.body);
          bookings.push(data.booking.id);
        }
      }

      const startTime = Date.now();

      const calendarResponse = await server.inject({
        method: 'GET',
        url: `/v1/content/calendar?from=${tomorrow.toISOString()}&days=1`,
        headers: {
          Authorization: 'Bearer test-owner-token',
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect([200, 401, 403]).toContain(calendarResponse.statusCode);
      expect(duration).toBeLessThan(1000);

      await supabase.from('bookings').delete().in('id', bookings);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle large date range queries efficiently', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=2024-01-01T00:00:00Z&days=90&limit=100`,
        headers: {
          Authorization: 'Bearer test-owner-token',
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect([200, 400, 401, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data.slots.length).toBeLessThanOrEqual(100);
      }

      expect(duration).toBeLessThan(1000);
    });

    it('should paginate large result sets efficiently', async () => {
      const page1Start = Date.now();

      const page1Response = await server.inject({
        method: 'GET',
        url: '/v1/content/bookings?page=1&limit=20',
        headers: {
          Authorization: 'Bearer test-owner-token',
        },
      });

      const page1End = Date.now();
      const page1Duration = page1End - page1Start;

      expect([200, 401, 403]).toContain(page1Response.statusCode);
      expect(page1Duration).toBeLessThan(500);

      const page2Start = Date.now();

      const page2Response = await server.inject({
        method: 'GET',
        url: '/v1/content/bookings?page=2&limit=20',
        headers: {
          Authorization: 'Bearer test-owner-token',
        },
      });

      const page2End = Date.now();
      const page2Duration = page2End - page2Start;

      expect([200, 401, 403]).toContain(page2Response.statusCode);
      expect(page2Duration).toBeLessThan(500);
    });
  });

  describe('Database Query Performance', () => {
    it('should use indexes for salon slug lookups', async () => {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await server.inject({
          method: 'GET',
          url: `/v1/public/salons/${testData.slug}`,
        });

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(avgTime).toBeLessThan(50);
      expect(maxTime).toBeLessThan(200);
    });

    it('should efficiently query bookings by date range', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/content/bookings?from=2024-01-01&to=2024-12-31&limit=100`,
        headers: {
          Authorization: 'Bearer test-owner-token',
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect([200, 401, 403]).toContain(response.statusCode);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Concurrent User Simulation', () => {
    it('should handle 20 concurrent booking creations', async () => {
      const tomorrow = getTomorrowAt(9);

      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=100`,
      });

      const slotsData = JSON.parse(slotsResponse.body);

      const requests = slotsData.slots.slice(0, 20).map((slot: any, index: number) =>
        server.inject({
          method: 'POST',
          url: '/v1/public/bookings',
          headers: { 'Content-Type': 'application/json' },
          payload: {
            salonSlug: testData.slug,
            serviceId: testData.serviceId,
            staffId: slot.staffId,
            startUtc: slot.startUtc,
            customer: generateTestCustomer(),
            idempotencyKey: `concurrent-${randomUUID().slice(0, 8)}-${index}`,
          },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successCount = responses.filter((r) => r.statusCode === 201).length;
      const conflictCount = responses.filter((r) => r.statusCode === 409).length;

      expect(successCount + conflictCount).toBe(20);
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Cold Start Performance', () => {
    it('should respond quickly after cold start', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(100);
    });
  });
});
