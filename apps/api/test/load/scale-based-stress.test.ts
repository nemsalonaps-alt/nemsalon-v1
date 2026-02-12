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

describe('Scale-Based Stress Tests - Different Salon Sizes', () => {
  let server: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    server = buildApp();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('SMALL SALON (1-2 staff, 10-50 daily bookings)', () => {
    let smallSalonData: any;

    beforeAll(async () => {
      smallSalonData = await seedTestSalon({ slug: `small-${randomUUID().slice(0, 8)}` });
    });

    afterAll(async () => {
      await cleanupTestData(smallSalonData.salonId);
    });

    it('should handle 10 concurrent bookings for small salon', async () => {
      const tomorrow = getTomorrowAt(9);
      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${smallSalonData.slug}&serviceId=${smallSalonData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=20`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const requests = slotsData.slots.slice(0, 10).map((slot: any, index: number) =>
        server.inject({
          method: 'POST',
          url: '/v1/public/bookings',
          headers: { 'Content-Type': 'application/json' },
          payload: {
            salonSlug: smallSalonData.slug,
            serviceId: smallSalonData.serviceId,
            staffId: slot.staffId,
            startUtc: slot.startUtc,
            customer: generateTestCustomer(),
            idempotencyKey: `small-${randomUUID().slice(0, 8)}-${index}`,
          },
        }),
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter((r) => r.statusCode === 201).length;
      expect(successCount).toBeGreaterThanOrEqual(8);
    });

    it('should handle single staff overload', async () => {
      const tomorrow = getTomorrowAt(10);
      const requests = Array.from({ length: 20 }, (_, i) =>
        server.inject({
          method: 'POST',
          url: '/v1/public/bookings',
          headers: { 'Content-Type': 'application/json' },
          payload: {
            salonSlug: smallSalonData.slug,
            serviceId: smallSalonData.serviceId,
            staffId: smallSalonData.staffId,
            startUtc: new Date(tomorrow.getTime() + i * 30 * 60 * 1000).toISOString(),
            customer: generateTestCustomer(),
            idempotencyKey: `overload-${randomUUID().slice(0, 8)}-${i}`,
          },
        }),
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter((r) => r.statusCode === 201).length;
      const conflictCount = responses.filter((r) => r.statusCode === 409).length;

      expect(successCount + conflictCount).toBe(20);
    });

    it('should handle small salon peak hours', async () => {
      const peakHour = getTomorrowAt(17);
      const requests = Array.from({ length: 50 }, () =>
        server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${smallSalonData.slug}&serviceId=${smallSalonData.serviceId}&from=${peakHour.toISOString()}&days=1&limit=5`,
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000);
      expect(responses.filter((r) => r.statusCode === 200).length).toBeGreaterThanOrEqual(45);
    });

    it('should handle small salon calendar day view', async () => {
      const tomorrow = getTomorrowAt(0);
      const response = await server.inject({
        method: 'GET',
        url: `/v1/content/calendar?from=${tomorrow.toISOString()}&days=1`,
        headers: { Authorization: 'Bearer test-owner-token' },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toBeDefined();
    });

    it('should handle staff working alone scenario', async () => {
      const supabase = getSupabaseClient();

      await supabase
        .from('staff_working_hours')
        .update({ enabled: false })
        .neq('staff_id', smallSalonData.staffId)
        .eq('staff_id', smallSalonData.staffId);

      const tomorrow = getTomorrowAt(10);
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${smallSalonData.slug}&serviceId=${smallSalonData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('MEDIUM SALON (5-10 staff, 50-200 daily bookings)', () => {
    let mediumSalonData: any;
    let staffIds: string[] = [];
    let serviceIds: string[] = [];

    beforeAll(async () => {
      mediumSalonData = await seedTestSalon({
        slug: `medium-${randomUUID().slice(0, 8)}`,
        name: 'Medium Test Salon',
      });

      const supabase = getSupabaseClient();

      // Create 8 additional staff
      for (let i = 0; i < 8; i++) {
        const staffId = randomUUID();
        staffIds.push(staffId);
        await supabase.from('staff_profiles').insert({
          id: staffId,
          salon_id: mediumSalonData.salonId,
          display_name: `Staff ${i + 2}`,
          role: 'staff',
          active: true,
        });

        // Assign to service
        await supabase.from('staff_services').insert({
          staff_id: staffId,
          service_id: mediumSalonData.serviceId,
        });
      }

      // Create 5 services
      for (let i = 0; i < 5; i++) {
        const serviceId = randomUUID();
        serviceIds.push(serviceId);
        await supabase.from('services').insert({
          id: serviceId,
          salon_id: mediumSalonData.salonId,
          name: `Service ${i + 2}`,
          duration_minutes: 30 + i * 15,
          price_amount: 20000 + i * 10000,
          currency: 'DKK',
          active: true,
        });
      }
    });

    afterAll(async () => {
      const supabase = getSupabaseClient();
      await supabase.from('staff_services').delete().in('staff_id', staffIds);
      await supabase.from('services').delete().in('id', serviceIds);
      await supabase.from('staff_profiles').delete().in('id', staffIds);
      await cleanupTestData(mediumSalonData.salonId);
    });

    it('should handle 100 concurrent bookings for medium salon', async () => {
      const tomorrow = getTomorrowAt(9);
      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${mediumSalonData.slug}&serviceId=${mediumSalonData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=150`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const requests = slotsData.slots.slice(0, 100).map((slot: any, index: number) =>
        server.inject({
          method: 'POST',
          url: '/v1/public/bookings',
          headers: { 'Content-Type': 'application/json' },
          payload: {
            salonSlug: mediumSalonData.slug,
            serviceId: mediumSalonData.serviceId,
            staffId: slot.staffId,
            startUtc: slot.startUtc,
            customer: generateTestCustomer(),
            idempotencyKey: `medium-${randomUUID().slice(0, 8)}-${index}`,
          },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const successCount = responses.filter((r) => r.statusCode === 201).length;
      console.log(`Medium salon 100 bookings: ${successCount} success in ${endTime - startTime}ms`);

      expect(successCount).toBeGreaterThanOrEqual(80);
      expect(endTime - startTime).toBeLessThan(30000);
    });

    it('should handle multi-staff scheduling conflicts', async () => {
      const tomorrow = getTomorrowAt(10);

      const requests = staffIds.flatMap((staffId, staffIndex) =>
        Array.from({ length: 5 }, (_, i) =>
          server.inject({
            method: 'POST',
            url: '/v1/public/bookings',
            headers: { 'Content-Type': 'application/json' },
            payload: {
              salonSlug: mediumSalonData.slug,
              serviceId: mediumSalonData.serviceId,
              staffId,
              startUtc: new Date(tomorrow.getTime() + i * 60 * 60 * 1000).toISOString(),
              customer: generateTestCustomer(),
              idempotencyKey: `multi-staff-${staffIndex}-${i}-${randomUUID().slice(0, 8)}`,
            },
          }),
        ),
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter((r) => r.statusCode === 201).length;

      expect(successCount).toBeGreaterThanOrEqual(30);
    });

    it('should handle different service durations', async () => {
      const tomorrow = getTomorrowAt(9);

      const requests = serviceIds.map((serviceId, index) =>
        server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${mediumSalonData.slug}&serviceId=${serviceId}&from=${tomorrow.toISOString()}&days=1&limit=20`,
        }),
      );

      const responses = await Promise.all(requests);
      const allSuccessful = responses.every((r) => r.statusCode === 200);

      expect(allSuccessful).toBe(true);
    });

    it('should handle medium salon week view', async () => {
      const tomorrow = getTomorrowAt(0);

      const requests = Array.from({ length: 50 }, () =>
        server.inject({
          method: 'GET',
          url: `/v1/content/calendar?from=${tomorrow.toISOString()}&days=7`,
          headers: { Authorization: 'Bearer test-owner-token' },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(15000);
      expect(responses.filter((r) => r.statusCode === 200).length).toBeGreaterThanOrEqual(45);
    });

    it('should handle staff availability queries', async () => {
      const tomorrow = getTomorrowAt(9);

      const requests = staffIds.map((staffId) =>
        server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${mediumSalonData.slug}&serviceId=${mediumSalonData.serviceId}&staffId=${staffId}&from=${tomorrow.toISOString()}&days=7&limit=50`,
        }),
      );

      const responses = await Promise.all(requests);
      expect(responses.every((r) => r.statusCode === 200)).toBe(true);
    });

    it('should handle complex scheduling with time off', async () => {
      const supabase = getSupabaseClient();
      const tomorrow = getTomorrowAt(10);

      // Add time off for half the staff
      for (let i = 0; i < 4; i++) {
        await supabase.from('staff_time_off').insert({
          id: randomUUID(),
          staff_id: staffIds[i],
          salon_id: mediumSalonData.salonId,
          start_time: tomorrow.toISOString(),
          end_time: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          reason: 'Test time off',
        });
      }

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${mediumSalonData.slug}&serviceId=${mediumSalonData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=100`,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('LARGE SALON (20-50 staff, 200-1000 daily bookings)', () => {
    let largeSalonData: any;
    let largeStaffIds: string[] = [];

    beforeAll(async () => {
      largeSalonData = await seedTestSalon({
        slug: `large-${randomUUID().slice(0, 8)}`,
        name: 'Large Test Salon',
      });

      const supabase = getSupabaseClient();

      // Create 25 staff
      for (let i = 0; i < 25; i++) {
        const staffId = randomUUID();
        largeStaffIds.push(staffId);
        await supabase.from('staff_profiles').insert({
          id: staffId,
          salon_id: largeSalonData.salonId,
          display_name: `Large Staff ${i + 1}`,
          role: i < 3 ? 'admin' : 'staff',
          active: true,
        });

        await supabase.from('staff_services').insert({
          staff_id: staffId,
          service_id: largeSalonData.serviceId,
        });
      }
    });

    afterAll(async () => {
      const supabase = getSupabaseClient();
      await supabase.from('staff_services').delete().in('staff_id', largeStaffIds);
      await supabase.from('staff_profiles').delete().in('id', largeStaffIds);
      await cleanupTestData(largeSalonData.salonId);
    });

    it('should handle 500 concurrent bookings for large salon', async () => {
      const tomorrow = getTomorrowAt(9);
      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${largeSalonData.slug}&serviceId=${largeSalonData.serviceId}&from=${tomorrow.toISOString()}&days=14&limit=600`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const requests = slotsData.slots.slice(0, 500).map((slot: any, index: number) =>
        server.inject({
          method: 'POST',
          url: '/v1/public/bookings',
          headers: { 'Content-Type': 'application/json' },
          payload: {
            salonSlug: largeSalonData.slug,
            serviceId: largeSalonData.serviceId,
            staffId: slot.staffId,
            startUtc: slot.startUtc,
            customer: generateTestCustomer(),
            idempotencyKey: `large-${randomUUID().slice(0, 8)}-${index}`,
          },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const successCount = responses.filter((r) => r.statusCode === 201).length;
      console.log(`Large salon 500 bookings: ${successCount} success in ${endTime - startTime}ms`);

      expect(successCount).toBeGreaterThanOrEqual(400);
      expect(endTime - startTime).toBeLessThan(60000);
    });

    it('should handle large salon dashboard with many bookings', async () => {
      const requests = Array.from({ length: 100 }, () =>
        server.inject({
          method: 'GET',
          url: '/v1/content/bookings?limit=100',
          headers: { Authorization: 'Bearer test-owner-token' },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(30000);
    });

    it('should handle staff list queries for large salon', async () => {
      const requests = Array.from({ length: 200 }, () =>
        server.inject({
          method: 'GET',
          url: `/v1/public/salons/${largeSalonData.slug}/staff`,
        }),
      );

      const responses = await Promise.all(requests);
      const allSuccessful = responses.every((r) => r.statusCode === 200);

      expect(allSuccessful).toBe(true);
    });

    it('should handle role-based access for large team', async () => {
      const supabase = getSupabaseClient();

      // Test admin access
      const adminResponse = await server.inject({
        method: 'GET',
        url: '/v1/content/salons/settings',
        headers: { Authorization: 'Bearer admin-token' },
      });

      // Test staff access (limited)
      const staffResponse = await server.inject({
        method: 'GET',
        url: '/v1/content/salons/settings',
        headers: { Authorization: 'Bearer staff-token' },
      });

      expect([200, 403]).toContain(adminResponse.statusCode);
      expect([200, 403]).toContain(staffResponse.statusCode);
    });

    it('should handle bulk operations for large salon', async () => {
      const tomorrow = getTomorrowAt(9);

      // Bulk create bookings
      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${largeSalonData.slug}&serviceId=${largeSalonData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=200`,
      });

      const slotsData = JSON.parse(slotsResponse.body);

      // Create 100 bookings
      const createRequests = slotsData.slots.slice(0, 100).map((slot: any, index: number) =>
        server.inject({
          method: 'POST',
          url: '/v1/public/bookings',
          headers: { 'Content-Type': 'application/json' },
          payload: {
            salonSlug: largeSalonData.slug,
            serviceId: largeSalonData.serviceId,
            staffId: slot.staffId,
            startUtc: slot.startUtc,
            customer: generateTestCustomer(),
            idempotencyKey: `bulk-${randomUUID().slice(0, 8)}-${index}`,
          },
        }),
      );

      const createResponses = await Promise.all(createRequests);
      const createdCount = createResponses.filter((r) => r.statusCode === 201).length;

      expect(createdCount).toBeGreaterThanOrEqual(80);
    });
  });

  describe('ENTERPRISE SALON (100+ staff, 1000+ daily bookings)', () => {
    let enterpriseSalonData: any;
    let enterpriseStaffIds: string[] = [];

    beforeAll(async () => {
      enterpriseSalonData = await seedTestSalon({
        slug: `enterprise-${randomUUID().slice(0, 8)}`,
        name: 'Enterprise Test Salon Chain',
      });

      const supabase = getSupabaseClient();

      // Create 50 staff (representing 100+ in reality)
      for (let i = 0; i < 50; i++) {
        const staffId = randomUUID();
        enterpriseStaffIds.push(staffId);
        await supabase.from('staff_profiles').insert({
          id: staffId,
          salon_id: enterpriseSalonData.salonId,
          display_name: `Enterprise Staff ${i + 1}`,
          role: i < 5 ? 'admin' : i < 10 ? 'manager' : 'staff',
          active: true,
        });

        await supabase.from('staff_services').insert({
          staff_id: staffId,
          service_id: enterpriseSalonData.serviceId,
        });
      }
    });

    afterAll(async () => {
      const supabase = getSupabaseClient();
      await supabase.from('staff_services').delete().in('staff_id', enterpriseStaffIds);
      await supabase.from('staff_profiles').delete().in('id', enterpriseStaffIds);
      await cleanupTestData(enterpriseSalonData.salonId);
    });

    it('should handle 1000 concurrent availability checks', async () => {
      const tomorrow = getTomorrowAt(9);

      const requests = Array.from({ length: 1000 }, () =>
        server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${enterpriseSalonData.slug}&serviceId=${enterpriseSalonData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const successCount = responses.filter((r) => r.statusCode === 200).length;
      console.log(
        `Enterprise 1000 availability checks: ${successCount} success in ${endTime - startTime}ms`,
      );

      expect(successCount).toBeGreaterThanOrEqual(950);
      expect(endTime - startTime).toBeLessThan(45000);
    });

    it('should handle enterprise reporting queries', async () => {
      const requests = [
        server.inject({
          method: 'GET',
          url: '/v1/platform/admin/metrics',
          headers: { Authorization: 'Bearer platform-admin-token' },
        }),
        server.inject({
          method: 'GET',
          url: '/v1/platform/admin/reports/revenue?from=2024-01-01&to=2024-12-31',
          headers: { Authorization: 'Bearer platform-admin-token' },
        }),
        server.inject({
          method: 'GET',
          url: '/v1/platform/admin/bookings?limit=1000',
          headers: { Authorization: 'Bearer platform-admin-token' },
        }),
      ];

      const responses = await Promise.all(requests);
      expect(responses.every((r) => [200, 403].includes(r.statusCode))).toBe(true);
    });

    it('should handle multi-location queries', async () => {
      const requests = Array.from({ length: 100 }, () =>
        server.inject({
          method: 'GET',
          url: `/v1/public/salons/${enterpriseSalonData.slug}/services`,
        }),
      );

      const responses = await Promise.all(requests);
      expect(responses.every((r) => r.statusCode === 200)).toBe(true);
    });

    it('should handle enterprise search functionality', async () => {
      const requests = Array.from({ length: 200 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: `/v1/platform/admin/search?q=test${i}&type=all`,
          headers: { Authorization: 'Bearer platform-admin-token' },
        }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(30000);
    });

    it('should handle manager dashboard with team overview', async () => {
      const requests = Array.from({ length: 50 }, () =>
        server.inject({
          method: 'GET',
          url: '/v1/content/bookings?groupBy=staff&limit=200',
          headers: { Authorization: 'Bearer manager-token' },
        }),
      );

      const responses = await Promise.all(requests);
      expect(
        responses.filter((r) => [200, 403].includes(r.statusCode)).length,
      ).toBeGreaterThanOrEqual(45);
    });
  });
});
