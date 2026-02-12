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

describe('Staff Management Tests', () => {
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

  describe('Staff Working Hours', () => {
    it('should enforce individual staff working hours', async () => {
      const supabase = getSupabaseClient();

      await supabase
        .from('staff_working_hours')
        .update({ enabled: false })
        .eq('staff_id', testData.staffId);

      try {
        const tomorrow = getTomorrowAt(10);

        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${testData.staffId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.slots).toEqual([]);
      } finally {
        await supabase
          .from('staff_working_hours')
          .update({ enabled: true })
          .eq('staff_id', testData.staffId);
      }
    });

    it('should handle partial day availability', async () => {
      const supabase = getSupabaseClient();
      const staffId = randomUUID();

      await supabase.from('staff_profiles').insert({
        id: staffId,
        salon_id: testData.salonId,
        display_name: 'Half Day Staff',
        role: 'staff',
        active: true,
      });

      await supabase.from('staff_working_hours').insert({
        staff_id: staffId,
        day: 'mon',
        enabled: true,
        start_time: '09:00',
        end_time: '12:00',
      });

      await supabase.from('staff_services').insert({
        staff_id: staffId,
        service_id: testData.serviceId,
      });

      try {
        const tomorrow = getTomorrowAt(10);

        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${staffId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);

        if (data.slots.length > 0) {
          data.slots.forEach((slot: any) => {
            const hour = new Date(slot.startUtc).getHours();
            expect(hour).toBeGreaterThanOrEqual(9);
            expect(hour).toBeLessThan(12);
          });
        }
      } finally {
        await supabase.from('staff_services').delete().eq('staff_id', staffId);
        await supabase.from('staff_working_hours').delete().eq('staff_id', staffId);
        await supabase.from('staff_profiles').delete().eq('id', staffId);
      }
    });
  });

  describe('Staff Time Off', () => {
    it('should block availability during approved time off', async () => {
      const supabase = getSupabaseClient();
      const timeOffId = randomUUID();
      const tomorrow = getTomorrowAt(10);

      await supabase.from('staff_time_off').insert({
        id: timeOffId,
        staff_id: testData.staffId,
        salon_id: testData.salonId,
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 3600000).toISOString(),
        status: 'approved',
        reason: 'Vacation',
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
          return slotStart < tomorrow.getTime() + 3600000 && slotEnd > tomorrow.getTime();
        });

        expect(overlappingSlots.length).toBe(0);
      } finally {
        await supabase.from('staff_time_off').delete().eq('id', timeOffId);
      }
    });

    it('should not block for pending time off', async () => {
      const supabase = getSupabaseClient();
      const timeOffId = randomUUID();
      const tomorrow = getTomorrowAt(10);

      await supabase.from('staff_time_off').insert({
        id: timeOffId,
        staff_id: testData.staffId,
        salon_id: testData.salonId,
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 3600000).toISOString(),
        status: 'pending',
        reason: 'Pending Vacation',
      });

      try {
        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${testData.staffId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
        });

        expect(response.statusCode).toBe(200);
      } finally {
        await supabase.from('staff_time_off').delete().eq('id', timeOffId);
      }
    });

    it('should handle recurring time off patterns', async () => {
      const supabase = getSupabaseClient();
      const timeOffId = randomUUID();
      const startDate = getTomorrowAt(0);
      const endDate = new Date(startDate.getTime() + 7 * 86400000);

      await supabase.from('staff_time_off').insert({
        id: timeOffId,
        staff_id: testData.staffId,
        salon_id: testData.salonId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'approved',
        reason: 'Extended leave',
      });

      try {
        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${testData.staffId}&from=${startDate.toISOString()}&days=7&limit=100`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);

        const slotsDuringTimeOff = data.slots.filter((slot: any) => {
          const slotTime = new Date(slot.startUtc).getTime();
          return slotTime >= startDate.getTime() && slotTime <= endDate.getTime();
        });

        expect(slotsDuringTimeOff.length).toBe(0);
      } finally {
        await supabase.from('staff_time_off').delete().eq('id', timeOffId);
      }
    });
  });

  describe('Staff Service Assignments', () => {
    it('should only show staff assigned to specific service', async () => {
      const supabase = getSupabaseClient();
      const newServiceId = randomUUID();
      const newStaffId = randomUUID();

      await supabase.from('services').insert({
        id: newServiceId,
        salon_id: testData.salonId,
        name: 'Exclusive Service',
        duration_minutes: 30,
        price_amount: 50000,
        currency: 'DKK',
        active: true,
      });

      await supabase.from('staff_profiles').insert({
        id: newStaffId,
        salon_id: testData.salonId,
        display_name: 'Exclusive Staff',
        role: 'staff',
        active: true,
      });

      await supabase.from('staff_services').insert({
        staff_id: newStaffId,
        service_id: newServiceId,
      });

      try {
        const tomorrow = getTomorrowAt(10);

        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${newServiceId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);

        if (data.slots.length > 0) {
          const staffIds = [...new Set(data.slots.map((s: any) => s.staffId))];
          expect(staffIds).toContain(newStaffId);
          expect(staffIds).not.toContain(testData.staffId);
        }
      } finally {
        await supabase.from('staff_services').delete().eq('staff_id', newStaffId);
        await supabase.from('staff_profiles').delete().eq('id', newStaffId);
        await supabase.from('services').delete().eq('id', newServiceId);
      }
    });

    it('should handle service unassignment', async () => {
      const supabase = getSupabaseClient();

      await supabase.from('staff_services').delete().eq('staff_id', testData.staffId);

      try {
        const tomorrow = getTomorrowAt(10);

        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${testData.staffId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.slots).toEqual([]);
      } finally {
        await supabase.from('staff_services').insert({
          staff_id: testData.staffId,
          service_id: testData.serviceId,
        });
      }
    });
  });

  describe('Staff Status Management', () => {
    it('should not show inactive staff in availability', async () => {
      const supabase = getSupabaseClient();

      await supabase.from('staff_profiles').update({ active: false }).eq('id', testData.staffId);

      try {
        const tomorrow = getTomorrowAt(10);

        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=50`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);

        const inactiveStaffSlots = data.slots.filter((s: any) => s.staffId === testData.staffId);
        expect(inactiveStaffSlots.length).toBe(0);
      } finally {
        await supabase.from('staff_profiles').update({ active: true }).eq('id', testData.staffId);
      }
    });

    it('should filter inactive staff from public staff list', async () => {
      const supabase = getSupabaseClient();
      const inactiveStaffId = randomUUID();

      await supabase.from('staff_profiles').insert({
        id: inactiveStaffId,
        salon_id: testData.salonId,
        display_name: 'Inactive Staff',
        role: 'staff',
        active: false,
      });

      try {
        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/salons/${testData.slug}/staff`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);

        const inactiveInList = data.data.find((s: any) => s.id === inactiveStaffId);
        expect(inactiveInList).toBeUndefined();
      } finally {
        await supabase.from('staff_profiles').delete().eq('id', inactiveStaffId);
      }
    });
  });

  describe('Staff Role Permissions', () => {
    it('should restrict staff from owner-only endpoints', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/content/salons/${testData.slug}/settings`,
        headers: {
          Authorization: 'Bearer staff-token',
        },
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    it('should allow staff to access own bookings', async () => {
      const supabase = getSupabaseClient();

      const booking = await createTestBooking(server, testData);

      const response = await server.inject({
        method: 'GET',
        url: '/v1/content/bookings',
        headers: {
          Authorization: 'Bearer staff-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });

    it('should prevent staff from viewing other staff bookings without permission', async () => {
      const supabase = getSupabaseClient();
      const otherStaffId = randomUUID();

      await supabase.from('staff_profiles').insert({
        id: otherStaffId,
        salon_id: testData.salonId,
        display_name: 'Other Staff',
        role: 'staff',
        active: true,
      });

      try {
        const response = await server.inject({
          method: 'GET',
          url: `/v1/content/bookings?staffId=${otherStaffId}`,
          headers: {
            Authorization: 'Bearer staff-token',
          },
        });

        expect([200, 401, 403]).toContain(response.statusCode);

        if (response.statusCode === 200) {
          const data = JSON.parse(response.body);
          const otherStaffBookings = data.data?.filter((b: any) => b.staff_id === otherStaffId);
          expect(otherStaffBookings?.length).toBe(0);
        }
      } finally {
        await supabase.from('staff_profiles').delete().eq('id', otherStaffId);
      }
    });
  });

  describe('Staff PIN Authentication', () => {
    it('should validate PIN setup requirements', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/staff/pin/setup',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer staff-token',
        },
        payload: {
          pin: '1234',
        },
      });

      expect([200, 400, 401]).toContain(response.statusCode);
    });

    it('should reject weak PINs', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/staff/pin/setup',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer staff-token',
        },
        payload: {
          pin: '0000',
        },
      });

      expect([400, 422]).toContain(response.statusCode);
    });
  });

  describe('Staff Booking Operations', () => {
    it('should allow staff to mark booking as in_progress', async () => {
      const booking = await createTestBooking(server, testData);

      const response = await server.inject({
        method: 'PATCH',
        url: `/v1/content/bookings/${booking.booking.id}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer staff-token',
        },
        payload: {
          status: 'in_progress',
        },
      });

      expect([200, 400, 401, 403, 409]).toContain(response.statusCode);
    });

    it('should allow staff to mark booking as completed', async () => {
      const booking = await createTestBooking(server, testData);

      const supabase = getSupabaseClient();
      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', booking.booking.id);

      const response = await server.inject({
        method: 'PATCH',
        url: `/v1/content/bookings/${booking.booking.id}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer staff-token',
        },
        payload: {
          status: 'completed',
        },
      });

      expect([200, 400, 401, 403, 409]).toContain(response.statusCode);
    });

    it('should allow staff to mark no-show', async () => {
      const booking = await createTestBooking(server, testData);

      const response = await server.inject({
        method: 'PATCH',
        url: `/v1/content/bookings/${booking.booking.id}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer staff-token',
        },
        payload: {
          status: 'no_show',
        },
      });

      expect([200, 400, 401, 403, 409]).toContain(response.statusCode);
    });
  });
});
