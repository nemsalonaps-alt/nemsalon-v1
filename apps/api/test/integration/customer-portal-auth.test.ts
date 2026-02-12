import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { buildApp } from '../../src/server/build-app.ts';
import { getSupabaseClient } from '../../src/server/db.ts';
import { seedTestSalon, cleanupTestData, getTomorrowAt } from '../test-utils.ts';

describe('Customer portal (authenticated)', () => {
  let server: ReturnType<typeof buildApp>;
  let testData: Awaited<ReturnType<typeof seedTestSalon>>;
  const createdUsers: string[] = [];

  beforeAll(async () => {
    server = buildApp();
    await server.ready();
    testData = await seedTestSalon();
  });

  afterAll(async () => {
    const supabase = getSupabaseClient();
    for (const userId of createdUsers) {
      await supabase.from('users').delete().eq('id', userId);
      await supabase.auth.admin.deleteUser(userId);
    }
    await cleanupTestData(testData.salonId);
    await server.close();
  });

  async function createPortalCustomer() {
    const supabase = getSupabaseClient();
    const email = `portal+${randomUUID()}@example.com`;
    const password = 'TestPass123!';
    const { data: authUser, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error || !authUser.user) {
      throw error ?? new Error('Failed to create auth user');
    }

    createdUsers.push(authUser.user.id);
    await supabase.from('users').insert({
      id: authUser.user.id,
      email
    });

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        salon_id: testData.salonId,
        user_id: authUser.user.id,
        name: 'Portal Customer',
        email
      })
      .select()
      .single();
    if (customerError || !customer) {
      throw customerError ?? new Error('Failed to create customer');
    }

    return { userId: authUser.user.id, customerId: customer.id };
  }

  async function createBooking(customerId: string, startTime: string, status = 'confirmed') {
    const supabase = getSupabaseClient();
    const start = new Date(startTime);
    const end = new Date(start.getTime() + 30 * 60 * 1000).toISOString();
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        salon_id: testData.salonId,
        customer_id: customerId,
        staff_id: testData.staffId,
        service_id: testData.serviceId,
        start_time: start.toISOString(),
        end_time: end,
        status,
        total_amount: 29900,
        currency: 'DKK'
      })
      .select()
      .single();
    if (error || !booking) {
      throw error ?? new Error('Failed to create booking');
    }
    return booking;
  }

  it('lists bookings for the authenticated customer', async () => {
    const { userId, customerId } = await createPortalCustomer();
    const start = getTomorrowAt(10).toISOString();
    await createBooking(customerId, start);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/portal/bookings?status=all',
      headers: { 'x-user-id': userId }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: Array<{ customerId: string; manageUrl?: string | null }> };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.some((b) => b.customerId === customerId)).toBe(true);
    expect(body.data.some((b) => 'manageUrl' in b)).toBe(true);
  });

  it('cancels a booking within allowed window', async () => {
    const { userId, customerId } = await createPortalCustomer();
    const start = new Date(getTomorrowAt(10).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const booking = await createBooking(customerId, start);

    const response = await server.inject({
      method: 'POST',
      url: `/v1/portal/bookings/${booking.id}/cancel`,
      headers: { 'x-user-id': userId }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { booking: { status: string } };
    expect(body.booking.status).toBe('cancelled');
  });

  it('rejects cancellation inside the cancellation window', async () => {
    const { userId, customerId } = await createPortalCustomer();
    const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const booking = await createBooking(customerId, start);

    const response = await server.inject({
      method: 'POST',
      url: `/v1/portal/bookings/${booking.id}/cancel`,
      headers: { 'x-user-id': userId }
    });

    expect(response.statusCode).toBe(409);
  });

  it('reschedules to an available slot', async () => {
    const { userId, customerId } = await createPortalCustomer();
    const originalStart = new Date(getTomorrowAt(10).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const booking = await createBooking(customerId, originalStart);

    const availability = await server.inject({
      method: 'GET',
      url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${testData.staffId}&from=${new Date(originalStart).toISOString()}&days=1&limit=10`
    });
    const availabilityBody = availability.json() as { slots: Array<{ startUtc: string }> };
    const slot = availabilityBody.slots.find((s) => s.startUtc !== originalStart) ?? availabilityBody.slots[0];

    const response = await server.inject({
      method: 'POST',
      url: `/v1/portal/bookings/${booking.id}/reschedule`,
      headers: { 'x-user-id': userId, 'Content-Type': 'application/json' },
      payload: { startUtc: slot.startUtc }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { booking: { startTime: string } };
    expect(new Date(body.booking.startTime).toISOString()).toBe(new Date(slot.startUtc).toISOString());
  });
});
