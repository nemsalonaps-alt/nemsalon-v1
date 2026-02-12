import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { buildApp } from '../../src/server/build-app.ts';
import { getSupabaseClient } from '../../src/server/db.ts';

describe('Booking status transitions', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('enforces valid status transitions for owner actions', async () => {
    const supabase = getSupabaseClient();
    const email = `owner+${randomUUID()}@example.com`;
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

    const userId = authUser.user.id;

    await supabase.from('salons').insert({
      id: salonId,
      name: 'Test Salon',
      timezone: 'Europe/Copenhagen',
      locale: 'da-DK',
      currency: 'DKK'
    });
    await supabase.from('users').insert({
      id: userId,
      email,
      primary_salon_id: salonId
    });
    await supabase.from('memberships').insert({
      salon_id: salonId,
      user_id: userId,
      role: 'owner',
      active: true
    });
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
    await supabase.from('customers').insert({
      id: customerId,
      salon_id: salonId,
      name: 'Test Customer',
      email: `customer+${randomUUID()}@example.com`
    });

    const start = new Date();
    start.setDate(start.getDate() + 2);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000).toISOString();

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        salon_id: salonId,
        customer_id: customerId,
        staff_id: staffId,
        service_id: serviceId,
        start_time: start.toISOString(),
        end_time: end,
        status: 'pending',
        total_amount: 45000,
        currency: 'DKK'
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw bookingError ?? new Error('Failed to create booking');
    }

    try {
      const invalidResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/bookings/${booking.id}`,
        headers: { 'x-user-id': userId, 'Content-Type': 'application/json' },
        payload: { status: 'completed' }
      });

      expect(invalidResponse.statusCode).toBe(400);
      expect(invalidResponse.json().code).toBe('BOOKING_INVALID_STATUS_TRANSITION');

      const confirmResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/bookings/${booking.id}`,
        headers: { 'x-user-id': userId, 'Content-Type': 'application/json' },
        payload: { status: 'confirmed' }
      });

      expect(confirmResponse.statusCode).toBe(200);

      const skipResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/bookings/${booking.id}`,
        headers: { 'x-user-id': userId, 'Content-Type': 'application/json' },
        payload: { status: 'completed' }
      });

      expect(skipResponse.statusCode).toBe(400);
      expect(skipResponse.json().code).toBe('BOOKING_INVALID_STATUS_TRANSITION');

      const inProgressResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/bookings/${booking.id}`,
        headers: { 'x-user-id': userId, 'Content-Type': 'application/json' },
        payload: { status: 'in_progress' }
      });

      expect(inProgressResponse.statusCode).toBe(200);

      const completeResponse = await app.inject({
        method: 'PATCH',
        url: `/v1/bookings/${booking.id}`,
        headers: { 'x-user-id': userId, 'Content-Type': 'application/json' },
        payload: { status: 'completed' }
      });

      expect(completeResponse.statusCode).toBe(200);
    } finally {
      await supabase.from('bookings').delete().eq('id', booking.id);
      await supabase.from('customers').delete().eq('id', customerId);
      await supabase.from('staff_profiles').delete().eq('id', staffId);
      await supabase.from('services').delete().eq('id', serviceId);
      await supabase.from('memberships').delete().eq('salon_id', salonId);
      await supabase.from('users').delete().eq('id', userId);
      await supabase.from('salons').delete().eq('id', salonId);
      await supabase.auth.admin.deleteUser(userId);
    }
  });
});
