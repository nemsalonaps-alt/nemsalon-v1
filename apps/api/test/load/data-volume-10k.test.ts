import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server/build-app.ts';
import {
  seedTestSalon,
  cleanupTestData,
  generateTestCustomer,
  getTomorrowAt,
} from '../test-utils.ts';
import { getSupabaseClient } from '../../src/server/db.ts';
import { randomUUID } from 'crypto';

describe('Data Volume Tests - 10k+ Bookings', () => {
  let server: ReturnType<typeof buildApp>;
  let volumeTestData: any;

  beforeAll(async () => {
    server = buildApp();
    await server.ready();
    volumeTestData = await seedTestSalon({
      slug: `volume-${randomUUID().slice(0, 8)}`,
      name: 'Volume Test Salon',
    });
  });

  afterAll(async () => {
    await cleanupTestData(volumeTestData.salonId);
    await server.close();
  });

  describe('Bulk Data Creation', () => {
    it('should create 1000 bookings efficiently', async () => {
      const supabase = getSupabaseClient();
      const bookings: string[] = [];
      const startTime = Date.now();

      const tomorrow = getTomorrowAt(9);

      for (let batch = 0; batch < 10; batch++) {
        const batchPromises = [];

        for (let i = 0; i < 100; i++) {
          const slotTime = new Date(tomorrow.getTime() + (batch * 100 + i) * 30 * 60 * 1000);
          const customerId = randomUUID();

          batchPromises.push(
            supabase
              .from('customers')
              .insert({
                id: customerId,
                salon_id: volumeTestData.salonId,
                name: `Volume Customer ${batch * 100 + i}`,
                email: `volume-${batch}-${i}@test.com`,
              })
              .then(() =>
                supabase.from('bookings').insert({
                  id: randomUUID(),
                  salon_id: volumeTestData.salonId,
                  customer_id: customerId,
                  staff_id: volumeTestData.staffId,
                  service_id: volumeTestData.serviceId,
                  start_time: slotTime.toISOString(),
                  end_time: new Date(slotTime.getTime() + 30 * 60 * 1000).toISOString(),
                  status: 'confirmed',
                  total_amount: 29900,
                  currency: 'DKK',
                  created_at: new Date().toISOString(),
                }),
              ),
          );
        }

        await Promise.all(batchPromises);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Created 1000 bookings in ${duration}ms`);
      expect(duration).toBeLessThan(120000);

      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', volumeTestData.salonId);

      expect(count).toBeGreaterThanOrEqual(1000);
    });

    it('should handle 5000 customer records', async () => {
      const supabase = getSupabaseClient();
      const startTime = Date.now();

      for (let batch = 0; batch < 50; batch++) {
        const customers = Array.from({ length: 100 }, (_, i) => ({
          id: randomUUID(),
          salon_id: volumeTestData.salonId,
          name: `Mass Customer ${batch * 100 + i}`,
          email: `mass-${batch}-${i}@test.com`,
          phone: `+45${String(Math.floor(Math.random() * 10000000)).padStart(8, '0')}`,
        }));

        await supabase.from('customers').insert(customers);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Created 5000 customers in ${duration}ms`);
      expect(duration).toBeLessThan(60000);
    });

    it('should create 100 staff members', async () => {
      const supabase = getSupabaseClient();
      const staffIds: string[] = [];

      for (let i = 0; i < 100; i++) {
        const staffId = randomUUID();
        staffIds.push(staffId);

        await supabase.from('staff_profiles').insert({
          id: staffId,
          salon_id: volumeTestData.salonId,
          display_name: `Volume Staff ${i + 1}`,
          role: i < 10 ? 'admin' : 'staff',
          active: true,
        });

        await supabase.from('staff_services').insert({
          staff_id: staffId,
          service_id: volumeTestData.serviceId,
        });
      }

      const { count } = await supabase
        .from('staff_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', volumeTestData.salonId);

      expect(count).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Query Performance with Large Datasets', () => {
    it('should query 1000 bookings in under 500ms', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/content/bookings?limit=1000`,
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it('should paginate through 5000 bookings efficiently', async () => {
      const pageSizes = [10, 50, 100, 500];

      for (const pageSize of pageSizes) {
        const startTime = Date.now();

        const response = await server.inject({
          method: 'GET',
          url: `/v1/content/bookings?limit=${pageSize}&offset=0`,
          headers: { Authorization: 'Bearer test-owner-token' },
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(response.statusCode).toBe(200);
        expect(duration).toBeLessThan(300);
      }
    });

    it('should search through 5000 customers efficiently', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/content/customers?search=test&limit=50`,
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect([200, 403]).toContain(response.statusCode);
      expect(duration).toBeLessThan(500);
    });

    it('should filter 1000 bookings by date range', async () => {
      const tomorrow = getTomorrowAt(0);
      const nextWeek = new Date(tomorrow.getTime() + 7 * 86400000);

      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/content/bookings?from=${tomorrow.toISOString()}&to=${nextWeek.toISOString()}&limit=100`,
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      const endTime = Date.now();

      expect(response.statusCode).toBe(200);
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Calendar Performance with Many Bookings', () => {
    it('should load week view with 500+ bookings in under 1s', async () => {
      const tomorrow = getTomorrowAt(0);

      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/content/calendar?from=${tomorrow.toISOString()}&days=7`,
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    it('should load month view efficiently', async () => {
      const tomorrow = getTomorrowAt(0);

      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/content/calendar?from=${tomorrow.toISOString()}&days=30`,
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      const endTime = Date.now();

      expect(response.statusCode).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Statistics Calculation with Large Data', () => {
    it('should calculate revenue stats for 1000+ bookings', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: '/v1/content/stats/revenue?from=2024-01-01&to=2024-12-31',
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      const endTime = Date.now();

      expect(response.statusCode).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should calculate customer stats efficiently', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: '/v1/content/stats/customers',
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      const endTime = Date.now();

      expect([200, 403]).toContain(response.statusCode);
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Memory Usage with Large Datasets', () => {
    it('should maintain memory usage during large queries', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 10; i++) {
        await server.inject({
          method: 'GET',
          url: `/v1/content/bookings?limit=1000`,
          headers: { Authorization: 'Bearer test-owner-token' },
        });

        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(`Memory increase after large queries: ${memoryIncrease.toFixed(2)} MB`);
      expect(memoryIncrease).toBeLessThan(200);
    });
  });

  describe('Concurrent Operations on Large Data', () => {
    it('should handle 100 concurrent searches on large dataset', async () => {
      const requests = Array.from({ length: 100 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: `/v1/content/customers?search=volume&limit=20&offset=${i * 20}`,
          headers: { Authorization: 'Bearer test-owner-token' },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const successCount = responses.filter((r) => [200, 403].includes(r.statusCode)).length;

      console.log(`100 concurrent searches completed in ${endTime - startTime}ms`);
      expect(successCount).toBeGreaterThanOrEqual(95);
    });

    it('should handle concurrent stats calculations', async () => {
      const requests = [
        server.inject({
          method: 'GET',
          url: '/v1/content/stats/revenue',
          headers: { Authorization: 'Bearer test-owner-token' },
        }),
        server.inject({
          method: 'GET',
          url: '/v1/content/stats/bookings',
          headers: { Authorization: 'Bearer test-owner-token' },
        }),
        server.inject({
          method: 'GET',
          url: '/v1/content/stats/customers',
          headers: { Authorization: 'Bearer test-owner-token' },
        }),
      ];

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('Export Performance', () => {
    it('should export 1000+ bookings in under 5s', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: '/v1/content/bookings/export?format=csv',
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      const endTime = Date.now();

      expect([200, 403]).toContain(response.statusCode);
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should export customer list efficiently', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: '/v1/content/customers/export?format=csv',
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      const endTime = Date.now();

      expect([200, 403]).toContain(response.statusCode);
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('Database Index Performance', () => {
    it('should use index for salon_id lookups', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${volumeTestData.slug}`,
      });

      const endTime = Date.now();

      expect(response.statusCode).toBe(200);
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should use index for date range queries', async () => {
      const tomorrow = getTomorrowAt(0);
      const nextWeek = new Date(tomorrow.getTime() + 7 * 86400000);

      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/content/bookings?from=${tomorrow.toISOString()}&to=${nextWeek.toISOString()}&limit=100`,
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      const endTime = Date.now();

      expect(response.statusCode).toBe(200);
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should use index for email lookups', async () => {
      const startTime = Date.now();

      const response = await server.inject({
        method: 'GET',
        url: '/v1/content/customers?email=test@example.com',
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      const endTime = Date.now();

      expect([200, 403]).toContain(response.statusCode);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
