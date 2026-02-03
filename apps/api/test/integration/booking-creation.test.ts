import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { buildApp } from '../../src/server/build-app.ts';
import { getSupabaseClient } from '../../src/server/db.ts';

const allowIntegration = process.env.ALLOW_INTEGRATION_TESTS === 'true';
const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const itIfSupabase = allowIntegration && hasSupabase ? test : test.skip;

type SeedResult = {
  userId: string;
  salonId: string;
  staffId: string;
  serviceId: string;
  customerId: string;
  extraStaffId?: string;
};

describe('booking creation', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedBase(includeExtraStaff = false): Promise<SeedResult> {
    const supabase = getSupabaseClient();
    const email = `test+${randomUUID()}@example.com`;
    const password = 'TestPass123!';
    const salonId = randomUUID();
    const staffId = randomUUID();
    const serviceId = randomUUID();
    const customerId = randomUUID();
    const extraStaffId = includeExtraStaff ? randomUUID() : undefined;

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

  itIfSupabase('creates a draft booking for a valid slot', async () => {
    const seed = await seedBase();
    const startUtc = '2025-01-06T08:00:00.000Z';
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { 'x-user-id': seed.userId },
        payload: {
          serviceId: seed.serviceId,
          staffId: seed.staffId,
          startUtc,
          customerId: seed.customerId
        }
      });

      expect(response.statusCode).toBe(201);
      const booking = response.json() as { status: string; startTime: string; endTime: string };
      expect(booking.status).toBe('pending');
      expect(new Date(booking.startTime).toISOString()).toBe(startUtc);
      expect(new Date(booking.endTime).toISOString()).toBe('2025-01-06T09:00:00.000Z');
    } finally {
      await cleanup(seed);
    }
  });

  itIfSupabase('rejects overlapping bookings', async () => {
    const seed = await seedBase();
    const startUtc = '2025-01-06T08:00:00.000Z';
    try {
      const first = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { 'x-user-id': seed.userId },
        payload: {
          serviceId: seed.serviceId,
          staffId: seed.staffId,
          startUtc,
          customerId: seed.customerId
        }
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { 'x-user-id': seed.userId },
        payload: {
          serviceId: seed.serviceId,
          staffId: seed.staffId,
          startUtc,
          customerId: seed.customerId
        }
      });
      expect(second.statusCode).toBe(409);
      const body = second.json() as { message?: string };
      expect(body.message).toBe('error.booking.time_not_available');
    } finally {
      await cleanup(seed);
    }
  });

  itIfSupabase('rejects staff not assigned to service', async () => {
    const seed = await seedBase(true);
    const startUtc = '2025-01-06T08:00:00.000Z';
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { 'x-user-id': seed.userId },
        payload: {
          serviceId: seed.serviceId,
          staffId: seed.extraStaffId!,
          startUtc,
          customerId: seed.customerId
        }
      });
      expect(response.statusCode).toBe(400);
      const body = response.json() as { message?: string };
      expect(body.message).toBe('error.booking.staff_not_assigned_to_service');
    } finally {
      await cleanup(seed);
    }
  });

  itIfSupabase('rejects start time outside 15-minute grid', async () => {
    const seed = await seedBase();
    const startUtc = '2025-01-06T08:07:00.000Z';
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { 'x-user-id': seed.userId },
        payload: {
          serviceId: seed.serviceId,
          staffId: seed.staffId,
          startUtc,
          customerId: seed.customerId
        }
      });
      expect(response.statusCode).toBe(400);
      const body = response.json() as { message?: string };
      expect(body.message).toBe('error.booking.invalid_time_alignment');
    } finally {
      await cleanup(seed);
    }
  });
});
