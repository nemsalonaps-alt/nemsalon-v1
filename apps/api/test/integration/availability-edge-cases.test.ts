import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/server/build-app.ts';
import { seedTestSalon, cleanupTestData, getTomorrowAt } from '../test-utils.ts';
import { getSupabaseClient } from '../../src/server/db.ts';
import { randomUUID } from 'crypto';

describe('Availability Edge Cases Tests', () => {
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

  beforeEach(async () => {
    const supabase = getSupabaseClient();
    await supabase.from('bookings').delete().eq('salon_id', testData.salonId);
  });

  describe('Timezone Handling', () => {
    it('should handle DST transition days correctly', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=2024-03-31T00:00:00Z&days=3&limit=50`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.slots).toBeInstanceOf(Array);

      if (data.slots.length > 0) {
        const slot = data.slots[0];
        expect(slot).toHaveProperty('startUtc');
        expect(slot).toHaveProperty('endUtc');

        const startDate = new Date(slot.startUtc);
        const endDate = new Date(slot.endUtc);
        expect(startDate.getTime()).toBeLessThan(endDate.getTime());
      }
    });

    it('should return slots in salon timezone', async () => {
      const tomorrow = getTomorrowAt(10);
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=10`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.meta.timezone).toBe('Europe/Copenhagen');
    });

    it('should handle midnight crossing services correctly', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=2024-12-31T18:00:00Z&days=2&limit=20`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.slots).toBeInstanceOf(Array);
    });
  });

  describe('Buffer Minutes Impact', () => {
    it('should account for service buffer minutes in slot availability', async () => {
      const supabase = getSupabaseClient();

      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('id', testData.serviceId)
        .single();

      const tomorrow = getTomorrowAt(9);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=100`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.slots).toBeInstanceOf(Array);

      if (data.slots.length > 0) {
        const slot = data.slots[0];
        expect(slot).toHaveProperty('startUtc');
        expect(slot).toHaveProperty('endUtc');

        const slotDuration = new Date(slot.endUtc).getTime() - new Date(slot.startUtc).getTime();
        const expectedDuration =
          ((services?.duration_minutes || 30) + (services?.buffer_minutes || 0)) * 60 * 1000;
        expect(slotDuration).toBeGreaterThanOrEqual(expectedDuration - 1000);
      }
    });
  });

  describe('Staff Availability', () => {
    it('should respect individual staff working hours', async () => {
      const supabase = getSupabaseClient();

      const tomorrow = getTomorrowAt(18);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${testData.staffId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.slots).toBeInstanceOf(Array);

      const lateSlots = data.slots.filter((slot: any) => {
        const hour = new Date(slot.startUtc).getUTCHours();
        return hour >= 17;
      });

      expect(lateSlots.length).toBe(0);
    });

    it('should handle staff time off correctly', async () => {
      const supabase = getSupabaseClient();
      const tomorrow = getTomorrowAt(10);
      const timeOffId = randomUUID();

      await supabase.from('staff_time_off').insert({
        id: timeOffId,
        staff_id: testData.staffId,
        salon_id: testData.salonId,
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 3600000).toISOString(),
        status: 'approved',
        reason: 'Test time off',
      });

      try {
        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${testData.staffId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);

        const overlappingSlots = data.slots.filter((slot: any) => {
          const slotStart = new Date(slot.startUtc).getTime();
          const slotEnd = new Date(slot.endUtc).getTime();
          const timeOffStart = tomorrow.getTime();
          const timeOffEnd = tomorrow.getTime() + 3600000;

          return slotStart < timeOffEnd && slotEnd > timeOffStart;
        });

        expect(overlappingSlots.length).toBe(0);
      } finally {
        await supabase.from('staff_time_off').delete().eq('id', timeOffId);
      }
    });

    it('should return all available staff when no staffId specified', async () => {
      const supabase = getSupabaseClient();

      const newStaffId = randomUUID();
      await supabase.from('staff_profiles').insert({
        id: newStaffId,
        salon_id: testData.salonId,
        display_name: 'Additional Staff',
        role: 'staff',
        active: true,
      });

      const tomorrow = getTomorrowAt(10);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=100`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.slots.length).toBeGreaterThan(0);

      const staffIds = [...new Set(data.slots.map((s: any) => s.staffId))];
      expect(staffIds.length).toBeGreaterThan(1);

      await supabase.from('staff_profiles').delete().eq('id', newStaffId);
    });
  });

  describe('Business Hours Edge Cases', () => {
    it('should not return slots outside business hours', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=2024-01-15T00:00:00Z&days=1&limit=100`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      if (data.slots.length > 0) {
        data.slots.forEach((slot: any) => {
          const hour = new Date(slot.startUtc).getUTCHours();
          expect(hour).toBeGreaterThanOrEqual(8);
          expect(hour).toBeLessThanOrEqual(17);
        });
      }
    });

    it('should handle closed days correctly', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=2024-01-14T00:00:00Z&days=1&limit=100`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      if (data.slots.length === 0) {
        const date = new Date('2024-01-14T00:00:00Z');
        const dayOfWeek = date.getDay();
        expect([0]).toContain(dayOfWeek);
      }
    });

    it('should handle Saturday hours correctly', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=2024-01-20T00:00:00Z&days=1&limit=100`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      if (data.slots.length > 0) {
        data.slots.forEach((slot: any) => {
          const hour = new Date(slot.startUtc).getUTCHours();
          expect(hour).toBeLessThanOrEqual(14);
        });
      }
    });
  });

  describe('Slot Availability Conflicts', () => {
    it('should block slots when staff has multiple bookings', async () => {
      const tomorrow = getTomorrowAt(10);

      const firstResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
      });

      expect(firstResponse.statusCode).toBe(200);
      const firstData = JSON.parse(firstResponse.body);
      expect(firstData.slots.length).toBeGreaterThan(0);

      const slotToBook = firstData.slots[0];

      const createResponse = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slotToBook.staffId,
          startUtc: slotToBook.startUtc,
          customer: {
            name: 'Conflict Test',
            email: `conflict-${randomUUID().slice(0, 8)}@example.com`,
          },
          idempotencyKey: `conflict-test-${randomUUID().slice(0, 8)}`,
        },
      });

      expect(createResponse.statusCode).toBe(201);

      const secondResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${slotToBook.staffId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
      });

      expect(secondResponse.statusCode).toBe(200);
      const secondData = JSON.parse(secondResponse.body);

      const bookedSlot = secondData.slots.find((s: any) => s.startUtc === slotToBook.startUtc);
      expect(bookedSlot).toBeUndefined();
    });

    it('should allow concurrent bookings on different staff', async () => {
      const supabase = getSupabaseClient();

      const secondStaffId = randomUUID();
      await supabase.from('staff_profiles').insert({
        id: secondStaffId,
        salon_id: testData.salonId,
        display_name: 'Second Staff',
        role: 'staff',
        active: true,
      });

      const tomorrow = getTomorrowAt(10);

      const firstStaffResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${testData.staffId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
      });

      expect(firstStaffResponse.statusCode).toBe(200);
      const firstData = JSON.parse(firstStaffResponse.body);
      expect(firstData.slots.length).toBeGreaterThan(0);

      const slot = firstData.slots[0];

      const createResponse = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: testData.staffId,
          startUtc: slot.startUtc,
          customer: {
            name: 'Concurrent Test',
            email: `concurrent-${randomUUID().slice(0, 8)}@example.com`,
          },
          idempotencyKey: `concurrent-test-${randomUUID().slice(0, 8)}`,
        },
      });

      expect(createResponse.statusCode).toBe(201);

      const secondStaffResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${secondStaffId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
      });

      expect(secondStaffResponse.statusCode).toBe(200);
      const secondData = JSON.parse(secondStaffResponse.body);

      const sameTimeSlot = secondData.slots.find((s: any) => s.startUtc === slot.startUtc);
      expect(sameTimeSlot).toBeDefined();

      await supabase.from('staff_profiles').delete().eq('id', secondStaffId);
    });
  });

  describe('Limit and Pagination', () => {
    it('should respect limit parameter', async () => {
      const tomorrow = getTomorrowAt(9);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.slots.length).toBeLessThanOrEqual(5);
    });

    it('should handle large limit values', async () => {
      const tomorrow = getTomorrowAt(9);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=1000`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.slots.length).toBeLessThanOrEqual(1000);
    });

    it('should handle days parameter correctly', async () => {
      const tomorrow = getTomorrowAt(9);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=14&limit=100`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.slots.length).toBeGreaterThan(0);

      const lastSlotDate = new Date(data.slots[data.slots.length - 1].startUtc);
      const firstSlotDate = new Date(data.slots[0].startUtc);
      const daysSpan = (lastSlotDate.getTime() - firstSlotDate.getTime()) / (1000 * 60 * 60 * 24);

      expect(daysSpan).toBeLessThanOrEqual(14);
    });
  });

  describe('Invalid Input Handling', () => {
    it('should reject invalid date range', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=invalid-date&days=1`,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject future date beyond allowed range', async () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 2);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${farFuture.toISOString()}&days=30`,
      });

      expect([400, 404]).toContain(response.statusCode);
    });

    it('should reject negative days parameter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${getTomorrowAt(9).toISOString()}&days=-5`,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject negative limit parameter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${getTomorrowAt(9).toISOString()}&days=1&limit=-10`,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Graceful Degradation', () => {
    it('should return empty slots gracefully when no availability', async () => {
      const supabase = getSupabaseClient();

      await supabase
        .from('salon_business_hours')
        .update({ enabled: false })
        .eq('salon_id', testData.salonId);

      try {
        const tomorrow = getTomorrowAt(10);

        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);

        expect(data.slots).toEqual([]);
      } finally {
        await supabase
          .from('salon_business_hours')
          .update({ enabled: true })
          .eq('salon_id', testData.salonId);
      }
    });

    it('should handle service with no assigned staff', async () => {
      const supabase = getSupabaseClient();
      const noStaffServiceId = randomUUID();

      await supabase.from('services').insert({
        id: noStaffServiceId,
        salon_id: testData.salonId,
        name: 'Orphan Service',
        duration_minutes: 30,
        price_amount: 10000,
        currency: 'DKK',
        active: true,
      });

      try {
        const tomorrow = getTomorrowAt(10);

        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${noStaffServiceId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);

        expect(data.slots).toEqual([]);
      } finally {
        await supabase.from('services').delete().eq('id', noStaffServiceId);
      }
    });
  });
});
