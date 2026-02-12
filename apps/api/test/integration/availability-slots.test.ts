import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { buildApp } from '../../src/server/build-app.ts';
import { getSupabaseClient } from '../../src/server/db.ts';

// Always run tests (setup.ts handles env loading)
const itIfSupabase = test;

type SeedResult = {
  userId: string;
  salonId: string;
  staffId: string;
  serviceId: string;
  customerId: string;
  extraStaffId?: string;
};

describe('availability slots', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedBase(extraStaff = false): Promise<SeedResult> {
    const supabase = getSupabaseClient();
    const email = `test+${randomUUID()}@example.com`;
    const password = 'TestPass123!';
    const salonId = randomUUID();
    const staffId = randomUUID();
    const serviceId = randomUUID();
    const customerId = randomUUID();
    const extraStaffId = extraStaff ? randomUUID() : undefined;

    const { data: authUser, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error || !authUser.user) {
      throw error ?? new Error('Failed to create auth user');
    }

    await supabase.from('salons').insert({
      id: salonId,
      name: 'Test Salon',
      timezone: 'Europe/Copenhagen',
      locale: 'da-DK',
      currency: 'DKK'
    });
    await supabase.from('users').insert({
      id: authUser.user.id,
      email,
      primary_salon_id: salonId
    });
    await supabase.from('memberships').insert({
      salon_id: salonId,
      user_id: authUser.user.id,
      role: 'owner',
      active: true
    });
    await supabase.from('salon_business_hours').insert([
      { salon_id: salonId, day: 'mon', start_time: '09:00', end_time: '17:00', enabled: true },
      { salon_id: salonId, day: 'tue', start_time: '09:00', end_time: '17:00', enabled: true },
      { salon_id: salonId, day: 'wed', start_time: '09:00', end_time: '17:00', enabled: true },
      { salon_id: salonId, day: 'thu', start_time: '09:00', end_time: '17:00', enabled: true },
      { salon_id: salonId, day: 'fri', start_time: '09:00', end_time: '17:00', enabled: true },
      { salon_id: salonId, day: 'sat', start_time: '09:00', end_time: '17:00', enabled: false },
      { salon_id: salonId, day: 'sun', start_time: '09:00', end_time: '17:00', enabled: false }
    ]);
    await supabase.from('staff_profiles').insert({
      id: staffId,
      salon_id: salonId,
      display_name: 'Test Staff',
      role: 'staff'
    });
    await supabase.from('services').insert({
      id: serviceId,
      salon_id: salonId,
      name: 'Test Service',
      duration_minutes: 60,
      buffer_minutes: 0,
      price_amount: 45000,
      currency: 'DKK'
    });
    await supabase.from('staff_services').insert({
      staff_id: staffId,
      service_id: serviceId
    });
    await supabase.from('customers').insert({
      id: customerId,
      salon_id: salonId,
      name: 'Test Customer'
    });

    if (extraStaffId) {
      await supabase.from('staff_profiles').insert({
        id: extraStaffId,
        salon_id: salonId,
        display_name: 'Extra Staff',
        role: 'staff'
      });
    }

    return { userId: authUser.user.id, salonId, staffId, serviceId, customerId, extraStaffId };
  }

  async function cleanup(seed: SeedResult) {
    const supabase = getSupabaseClient();
    await supabase.from('bookings').delete().eq('salon_id', seed.salonId);
    await supabase.from('staff_time_off').delete().eq('salon_id', seed.salonId);
    await supabase.from('notification_outbox').delete().eq('salon_id', seed.salonId);
    await supabase.from('staff_services').delete().eq('staff_id', seed.staffId);
    if (seed.extraStaffId) {
      await supabase.from('staff_profiles').delete().eq('id', seed.extraStaffId);
    }
    await supabase.from('staff_profiles').delete().eq('id', seed.staffId);
    await supabase.from('services').delete().eq('id', seed.serviceId);
    await supabase.from('customers').delete().eq('id', seed.customerId);
    await supabase.from('salon_business_hours').delete().eq('salon_id', seed.salonId);
    await supabase.from('memberships').delete().eq('salon_id', seed.salonId);
    await supabase.from('users').delete().eq('id', seed.userId);
    await supabase.from('salons').delete().eq('id', seed.salonId);
    await supabase.auth.admin.deleteUser(seed.userId);
  }

  itIfSupabase('returns slots within business hours', async () => {
    const seed = await seedBase();
    const fromUtc = '2025-01-06T08:00:00.000Z';
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/availability/slots?serviceId=${seed.serviceId}&from=${encodeURIComponent(fromUtc)}&days=1&limit=3&intervalMinutes=60`,
        headers: { 'x-user-id': seed.userId }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as { slots: { startUtc: string; endUtc: string }[] };
      expect(body.slots.length).toBeGreaterThan(0);
      expect(body.slots[0].startUtc).toBe('2025-01-06T08:00:00.000Z');
      expect(body.slots[0].endUtc).toBe('2025-01-06T09:00:00.000Z');
    } finally {
      await cleanup(seed);
    }
  });

  itIfSupabase('filters out booked times', async () => {
    const seed = await seedBase();
    const supabase = getSupabaseClient();
    try {
      await supabase.from('bookings').insert({
        salon_id: seed.salonId,
        customer_id: seed.customerId,
        staff_id: seed.staffId,
        service_id: seed.serviceId,
        start_time: '2025-01-06T08:00:00.000Z',
        end_time: '2025-01-06T09:00:00.000Z',
        status: 'confirmed',
        total_amount: 45000,
        currency: 'DKK'
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/availability/slots?serviceId=${seed.serviceId}&from=${encodeURIComponent('2025-01-06T07:00:00.000Z')}&days=1&limit=6&intervalMinutes=60`,
        headers: { 'x-user-id': seed.userId }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as { slots: { startUtc: string; endUtc: string }[] };
      const blocked = body.slots.find((slot) => slot.startUtc === '2025-01-06T08:00:00.000Z');
      expect(blocked).toBeUndefined();
    } finally {
      await cleanup(seed);
    }
  });

  itIfSupabase('respects staff restriction', async () => {
    const seed = await seedBase(true);
    try {
      const fromUtc = '2025-01-06T08:00:00.000Z';
      const list = await app.inject({
        method: 'GET',
        url: `/v1/availability/slots?serviceId=${seed.serviceId}&from=${encodeURIComponent(fromUtc)}&days=1&limit=5`,
        headers: { 'x-user-id': seed.userId }
      });
      expect(list.statusCode).toBe(200);
      const body = list.json() as { slots: { staffId: string }[] };
      const uniqueStaff = new Set(body.slots.map((slot) => slot.staffId));
      expect(uniqueStaff.size).toBe(1);
      expect(uniqueStaff.has(seed.staffId)).toBe(true);

      const blocked = await app.inject({
        method: 'GET',
        url: `/v1/availability/slots?serviceId=${seed.serviceId}&staffId=${seed.extraStaffId}&from=${encodeURIComponent(fromUtc)}&days=1&limit=5`,
        headers: { 'x-user-id': seed.userId }
      });
      expect(blocked.statusCode).toBe(400);
      const errorBody = blocked.json() as { message?: string };
      expect(errorBody.message).toBe('error.availability.no_staff_for_service');
    } finally {
      await cleanup(seed);
    }
  });

  itIfSupabase('filters out staff time off', async () => {
    const seed = await seedBase();
    const supabase = getSupabaseClient();
    try {
      await supabase.from('staff_time_off').insert({
        salon_id: seed.salonId,
        staff_id: seed.staffId,
        start_time: '2025-01-06T08:00:00.000Z',
        end_time: '2025-01-06T09:00:00.000Z',
        reason: 'Personal'
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/availability/slots?serviceId=${seed.serviceId}&from=${encodeURIComponent('2025-01-06T07:00:00.000Z')}&days=1&limit=6&intervalMinutes=60`,
        headers: { 'x-user-id': seed.userId }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as { slots: { startUtc: string }[] };
      const blocked = body.slots.find((slot) => slot.startUtc === '2025-01-06T08:00:00.000Z');
      expect(blocked).toBeUndefined();
    } finally {
      await cleanup(seed);
    }
  });
});
