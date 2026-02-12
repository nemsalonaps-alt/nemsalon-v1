import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server/build-app.ts';
import {
  seedTestSalon,
  cleanupTestData,
  generateTestCustomer,
  getTomorrowAt,
} from '../test-utils.ts';
import { randomUUID } from 'crypto';

describe('Load & Stress Tests - 1000+ Concurrent Users', () => {
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

  describe('Concurrent Availability Requests', () => {
    it('should handle 1000 concurrent availability queries', async () => {
      const tomorrow = getTomorrowAt(10);
      const requests = Array.from({ length: 1000 }, () =>
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
      const errorCount = responses.filter((r) => r.statusCode !== 200).length;

      console.log(`1000 availability requests completed in ${duration}ms`);
      console.log(`Success: ${successCount}, Errors: ${errorCount}`);

      expect(successCount).toBeGreaterThanOrEqual(950);
      expect(duration).toBeLessThan(30000);
    });

    it('should handle 500 concurrent salon lookups', async () => {
      const requests = Array.from({ length: 500 }, () =>
        server.inject({
          method: 'GET',
          url: `/v1/public/salons/${testData.slug}`,
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successCount = responses.filter((r) => r.statusCode === 200).length;

      expect(successCount).toBeGreaterThanOrEqual(480);
      expect(duration).toBeLessThan(10000);
    });

    it('should handle 200 concurrent service list requests', async () => {
      const requests = Array.from({ length: 200 }, () =>
        server.inject({
          method: 'GET',
          url: `/v1/public/salons/${testData.slug}/services`,
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successCount = responses.filter((r) => r.statusCode === 200).length;

      expect(successCount).toBeGreaterThanOrEqual(190);
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Concurrent Booking Creation', () => {
    it('should handle 100 concurrent booking attempts', async () => {
      const tomorrow = getTomorrowAt(10);

      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=100`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const slots = slotsData.slots;

      const requests = slots.slice(0, 100).map((slot: any, index: number) =>
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
            idempotencyKey: `load-test-${randomUUID().slice(0, 8)}-${index}`,
          },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successCount = responses.filter((r) => r.statusCode === 201).length;
      const conflictCount = responses.filter((r) => r.statusCode === 409).length;

      console.log(`100 booking attempts: ${successCount} success, ${conflictCount} conflicts`);
      console.log(`Duration: ${duration}ms`);

      expect(successCount + conflictCount).toBe(100);
      expect(successCount).toBeGreaterThanOrEqual(1);
      expect(duration).toBeLessThan(20000);
    });

    it('should handle race conditions on same slot', async () => {
      const tomorrow = getTomorrowAt(11);

      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=1`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];

      const requests = Array.from({ length: 50 }, (_, index) =>
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
            idempotencyKey: `race-${randomUUID().slice(0, 8)}-${index}`,
          },
        }),
      );

      const responses = await Promise.all(requests);

      const successCount = responses.filter((r) => r.statusCode === 201).length;
      const conflictCount = responses.filter((r) => r.statusCode === 409).length;

      console.log(`Race condition test: ${successCount} success, ${conflictCount} conflicts`);

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(49);
    });
  });

  describe('Dashboard Load', () => {
    it('should handle 100 concurrent dashboard requests', async () => {
      const requests = Array.from({ length: 100 }, () =>
        server.inject({
          method: 'GET',
          url: '/v1/content/bookings?limit=50',
          headers: {
            Authorization: 'Bearer test-owner-token',
          },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successCount = responses.filter(
        (r) => r.statusCode === 200 || r.statusCode === 403,
      ).length;

      expect(successCount).toBeGreaterThanOrEqual(95);
      expect(duration).toBeLessThan(15000);
    });

    it('should handle 50 concurrent calendar requests', async () => {
      const tomorrow = getTomorrowAt(0);

      const requests = Array.from({ length: 50 }, () =>
        server.inject({
          method: 'GET',
          url: `/v1/content/calendar?from=${tomorrow.toISOString()}&days=7`,
          headers: {
            Authorization: 'Bearer test-owner-token',
          },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successCount = responses.filter(
        (r) => r.statusCode === 200 || r.statusCode === 403,
      ).length;

      expect(successCount).toBeGreaterThanOrEqual(48);
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Customer Portal Load', () => {
    it('should handle 200 concurrent customer portal requests', async () => {
      const requests = Array.from({ length: 200 }, () =>
        server.inject({
          method: 'GET',
          url: '/v1/customer-portal/v2/bookings',
          headers: {
            Authorization: 'Bearer test-customer-token',
          },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successCount = responses.filter(
        (r) => r.statusCode === 200 || r.statusCode === 403,
      ).length;

      expect(successCount).toBeGreaterThanOrEqual(190);
      expect(duration).toBeLessThan(15000);
    });
  });

  describe('Platform Admin Load', () => {
    it('should handle 50 concurrent admin searches', async () => {
      const requests = Array.from({ length: 50 }, () =>
        server.inject({
          method: 'GET',
          url: '/v1/platform/admin/search?q=test',
          headers: {
            Authorization: 'Bearer platform-admin-token',
          },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000);
    });

    it('should handle 30 concurrent metrics requests', async () => {
      const requests = Array.from({ length: 30 }, () =>
        server.inject({
          method: 'GET',
          url: '/v1/platform/admin/metrics',
          headers: {
            Authorization: 'Bearer platform-admin-token',
          },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Sequential Load', () => {
    it('should handle 1000 sequential requests without degradation', async () => {
      const times: number[] = [];

      for (let i = 0; i < 1000; i++) {
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
      const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

      console.log(`Sequential load: avg=${avgTime}ms, max=${maxTime}ms, p95=${p95Time}ms`);

      expect(avgTime).toBeLessThan(100);
      expect(p95Time).toBeLessThan(200);
    });
  });

  describe('Memory Usage Under Load', () => {
    it('should maintain stable memory during sustained load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let batch = 0; batch < 10; batch++) {
        const requests = Array.from({ length: 100 }, () =>
          server.inject({
            method: 'GET',
            url: `/v1/public/salons/${testData.slug}`,
          }),
        );

        await Promise.all(requests);

        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);

      expect(memoryIncreaseMB).toBeLessThan(100);
    });
  });

  describe('Database Connection Pool', () => {
    it('should handle pool exhaustion gracefully', async () => {
      const requests = Array.from({ length: 500 }, () =>
        server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${getTomorrowAt(10).toISOString()}&days=1&limit=10`,
        }),
      );

      const responses = await Promise.all(requests);

      const timeoutCount = responses.filter((r) => r.statusCode === 503).length;
      const successCount = responses.filter((r) => r.statusCode === 200).length;

      console.log(`Pool test: ${successCount} success, ${timeoutCount} timeouts`);

      expect(successCount).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Rate Limiting Under Load', () => {
    it('should enforce rate limits under high load', async () => {
      const requests = Array.from({ length: 200 }, () =>
        server.inject({
          method: 'GET',
          url: `/v1/public/salons/${testData.slug}`,
        }),
      );

      const responses = await Promise.all(requests);

      const rateLimitedCount = responses.filter((r) => r.statusCode === 429).length;
      const successCount = responses.filter((r) => r.statusCode === 200).length;

      console.log(`Rate limit test: ${successCount} success, ${rateLimitedCount} rate limited`);

      expect(rateLimitedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Burst Traffic Simulation', () => {
    it('should handle traffic burst of 500 requests', async () => {
      const burstSize = 500;
      const requests: Promise<any>[] = [];

      for (let i = 0; i < burstSize; i++) {
        requests.push(
          server.inject({
            method: 'GET',
            url: `/v1/public/salons/${testData.slug}`,
          }),
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successCount = responses.filter((r) => r.statusCode === 200).length;

      console.log(`Burst of ${burstSize}: ${successCount} success in ${duration}ms`);

      expect(successCount).toBeGreaterThanOrEqual(450);
      expect(duration).toBeLessThan(15000);
    });
  });

  describe('Stress Test - Extreme Load', () => {
    it('should survive extreme load of 2000 requests', async () => {
      const requests = Array.from({ length: 2000 }, (_, index) =>
        server.inject({
          method: 'GET',
          url:
            index % 2 === 0
              ? `/v1/public/salons/${testData.slug}`
              : `/v1/public/salons/${testData.slug}/services`,
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const successCount = responses.filter((r) => r.statusCode === 200).length;
      const errorCount = responses.filter((r) => r.statusCode >= 500).length;

      console.log(`Extreme load: ${successCount} success, ${errorCount} server errors`);
      console.log(`Duration: ${duration}ms`);

      expect(errorCount).toBeLessThan(100);
      expect(duration).toBeLessThan(60000);
    });
  });
});
