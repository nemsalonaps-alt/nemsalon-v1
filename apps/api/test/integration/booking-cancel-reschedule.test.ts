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
};

describe('booking cancel + reschedule', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedBase(): Promise<SeedResult> {
    const supabase = getSupabaseClient();
    const email = `test+${randomUUID()}@example.com`;
    const password = 'TestPass123!';
    const salonId = randomUUID();
    const staffId = randomUUID();
    const serviceId = randomUUID();
    const customerId = randomUUID();

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
      name: 'Test Customer',
      email: 'customer.cancel@example.com',
      phone: '+4512345678'
    });

    return { userId: authUser.user.id, salonId, staffId, serviceId, customerId };
  }

  async function cleanup(seed: SeedResult) {
    const supabase = getSupabaseClient();
    await supabase.from('bookings').delete().eq('salon_id', seed.salonId);
    await supabase.from('notification_outbox').delete().eq('salon_id', seed.salonId);
    await supabase.from('staff_services').delete().eq('staff_id', seed.staffId);
    await supabase.from('staff_profiles').delete().eq('id', seed.staffId);
    await supabase.from('services').delete().eq('id', seed.serviceId);
    await supabase.from('customers').delete().eq('id', seed.customerId);
    await supabase.from('salon_business_hours').delete().eq('salon_id', seed.salonId);
    await supabase.from('memberships').delete().eq('salon_id', seed.salonId);
    await supabase.from('users').delete().eq('id', seed.userId);
    await supabase.from('salons').delete().eq('id', seed.salonId);
    await supabase.auth.admin.deleteUser(seed.userId);
  }

  async function createBooking(
    seed: SeedResult,
    startUtc: string
  ): Promise<{ id: string }> {
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
    return response.json() as { id: string };
  }

  itIfSupabase('cancels confirmed booking (idempotent)', async () => {
    const seed = await seedBase();
    try {
      const booking = await createBooking(seed, '2025-01-06T08:00:00.000Z');
      const supabase = getSupabaseClient();
      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id);

      const cancel = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${booking.id}/cancel`,
        headers: { 'x-user-id': seed.userId },
        payload: { reasonKey: 'user.no_show', note: 'Client called to cancel.' }
      });
      expect(cancel.statusCode).toBe(200);
      const cancelBody = cancel.json() as { booking: { status: string } };
      expect(cancelBody.booking.status).toBe('cancelled');

      const again = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${booking.id}/cancel`,
        headers: { 'x-user-id': seed.userId }
      });
      expect(again.statusCode).toBe(200);
      const againBody = again.json() as { booking: { status: string } };
      expect(againBody.booking.status).toBe('cancelled');

      const { data: outbox } = await supabase
        .from('notification_outbox')
        .select('*')
        .eq('booking_id', booking.id);
      expect(outbox?.length).toBe(2);
    } finally {
      await cleanup(seed);
    }
  });

  itIfSupabase('reschedules booking to a free slot', async () => {
    const seed = await seedBase();
    try {
      const booking = await createBooking(seed, '2025-01-06T08:00:00.000Z');
      const supabase = getSupabaseClient();
      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id);

      const reschedule = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${booking.id}/reschedule`,
        headers: { 'x-user-id': seed.userId },
        payload: {
          staffId: seed.staffId,
          startUtc: '2025-01-06T09:00:00.000Z'
        }
      });
      expect(reschedule.statusCode).toBe(200);
      const body = reschedule.json() as { booking: { startTime: string; endTime: string } };
      expect(new Date(body.booking.startTime).toISOString()).toBe('2025-01-06T09:00:00.000Z');
      expect(new Date(body.booking.endTime).toISOString()).toBe('2025-01-06T10:00:00.000Z');
    } finally {
      await cleanup(seed);
    }
  });

  itIfSupabase('rejects reschedule on conflicting slot', async () => {
    const seed = await seedBase();
    const supabase = getSupabaseClient();
    try {
      const booking = await createBooking(seed, '2025-01-06T08:00:00.000Z');
      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id);

      await supabase.from('bookings').insert({
        salon_id: seed.salonId,
        customer_id: seed.customerId,
        staff_id: seed.staffId,
        service_id: seed.serviceId,
        start_time: '2025-01-06T09:00:00.000Z',
        end_time: '2025-01-06T10:00:00.000Z',
        status: 'confirmed',
        total_amount: 45000,
        currency: 'DKK'
      });

      const reschedule = await app.inject({
        method: 'POST',
        url: `/v1/bookings/${booking.id}/reschedule`,
        headers: { 'x-user-id': seed.userId },
        payload: {
          staffId: seed.staffId,
          startUtc: '2025-01-06T09:00:00.000Z'
        }
      });
      expect(reschedule.statusCode).toBe(409);
      const body = reschedule.json() as { message?: string };
      expect(body.message).toBe('error.booking.time_not_available');
    } finally {
      await cleanup(seed);
    }
  });
});
