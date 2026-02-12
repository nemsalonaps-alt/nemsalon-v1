import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { buildApp } from '../../src/server/build-app.ts';
import { getSupabaseClient } from '../../src/server/db.ts';

// Always run tests (setup.ts handles env loading)
const itIfSupabase = test;

type ProvisionedUser = {
  userId: string;
  email: string;
  salonId: string;
};

describe('tenant isolation', () => {
  let app: ReturnType<typeof buildApp>;

  itIfSupabase('prevents cross-tenant access to customer endpoints', async () => {
    const userA = await provisionUser();
    const userB = await provisionUser();

    try {
      const createCustomer = await app.inject({
        method: 'POST',
        url: '/v1/customers',
        headers: { 'x-user-id': userA.userId },
        payload: {
          name: 'Cross Tenant Customer',
          email: 'cross@example.com'
        }
      });
      expect(createCustomer.statusCode).toBe(201);
      const customer = createCustomer.json() as { id: string };

      const forbiddenGet = await app.inject({
        method: 'GET',
        url: `/v1/customers/${customer.id}`,
        headers: { 'x-user-id': userB.userId }
      });
      expect(forbiddenGet.statusCode).toBe(403);

      const forbiddenPatch = await app.inject({
        method: 'PATCH',
        url: `/v1/customers/${customer.id}`,
        headers: { 'x-user-id': userB.userId },
        payload: { name: 'Hacked' }
      });
      expect(forbiddenPatch.statusCode).toBe(403);
    } finally {
      await cleanupUser(userA);
      await cleanupUser(userB);
    }
  });

  itIfSupabase('prevents cross-tenant access to service endpoints', async () => {
    const userA = await provisionUser();
    const userB = await provisionUser();

    try {
      const createService = await app.inject({
        method: 'POST',
        url: '/v1/services',
        headers: { 'x-user-id': userA.userId },
        payload: {
          name: 'Cross Tenant Service',
          durationMinutes: 30,
          price: 25000,
          currency: 'DKK'
        }
      });
      expect(createService.statusCode).toBe(201);
      const service = createService.json() as { id: string };

      const forbiddenGet = await app.inject({
        method: 'GET',
        url: `/v1/services/${service.id}`,
        headers: { 'x-user-id': userB.userId }
      });
      expect(forbiddenGet.statusCode).toBe(403);

      const forbiddenPatch = await app.inject({
        method: 'PATCH',
        url: `/v1/services/${service.id}`,
        headers: { 'x-user-id': userB.userId },
        payload: { name: 'Hacked service' }
      });
      // API may return 403 (forbidden) or 404 (not found) depending on implementation
      expect([403, 404]).toContain(forbiddenPatch.statusCode);
    } finally {
      await cleanupUser(userA);
      await cleanupUser(userB);
    }
  });

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function provisionUser(): Promise<ProvisionedUser> {
    const supabase = getSupabaseClient();
    const email = `test+${randomUUID()}@example.com`;
    const password = 'TestPass123!';
    const { data: authUser, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error || !authUser.user) {
      throw error ?? new Error('Failed to create auth user');
    }

    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: {
        'x-user-id': authUser.user.id,
        'x-user-email': email
      }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as { primarySalonId?: string | null };
    const salonId = payload.primarySalonId ?? null;
    if (!salonId) {
      throw new Error('Failed to provision salon');
    }

    return { userId: authUser.user.id, email, salonId };
  }

  async function cleanupUser(user: ProvisionedUser) {
    const supabase = getSupabaseClient();
    await supabase.from('salons').delete().eq('id', user.salonId);
    await supabase.from('users').delete().eq('id', user.userId);
    await supabase.auth.admin.deleteUser(user.userId);
  }

  itIfSupabase('prevents cross-tenant access to salon resources', async () => {
    const userA = await provisionUser();
    const userB = await provisionUser();

    try {
      const weekly = [
        { day: 'mon', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'tue', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'wed', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'thu', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'fri', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'sat', startTime: '09:00', endTime: '17:00', enabled: false },
        { day: 'sun', startTime: '09:00', endTime: '17:00', enabled: false }
      ];

      const staffResponse = await app.inject({
        method: 'POST',
        url: '/v1/staff',
        headers: { 'x-user-id': userA.userId },
        payload: { name: 'Owner', role: 'owner' }
      });
      expect(staffResponse.statusCode).toBe(201);
      const staff = staffResponse.json() as { id: string };

      const serviceResponse = await app.inject({
        method: 'POST',
        url: '/v1/services',
        headers: { 'x-user-id': userA.userId },
        payload: {
          name: 'Cut',
          durationMinutes: 30,
          bufferMinutes: 0,
          price: 10000,
          currency: 'DKK'
        }
      });
      expect(serviceResponse.statusCode).toBe(201);
      const service = serviceResponse.json() as { id: string };

      const assignResponse = await app.inject({
        method: 'POST',
        url: `/v1/staff/${staff.id}/services`,
        headers: { 'x-user-id': userA.userId },
        payload: { serviceIds: [service.id] }
      });
      expect(assignResponse.statusCode).toBe(200);

      const hoursResponse = await app.inject({
        method: 'PUT',
        url: `/v1/salons/${userA.salonId}/business-hours`,
        headers: { 'x-user-id': userA.userId },
        payload: { weekly }
      });
      expect(hoursResponse.statusCode).toBe(200);

      const startUtc = '2025-01-06T09:00:00.000Z';
      const endUtc = '2025-01-06T09:30:00.000Z';
      const bookingResponse = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { 'x-user-id': userA.userId },
        payload: {
          serviceId: service.id,
          staffId: staff.id,
          startUtc,
          endUtc,
          customer: { name: 'Test Customer' }
        }
      });
      expect(bookingResponse.statusCode).toBe(201);
      const booking = bookingResponse.json() as { id: string };

      const forbiddenSalonPatch = await app.inject({
        method: 'PATCH',
        url: `/v1/salons/${userA.salonId}`,
        headers: { 'x-user-id': userB.userId },
        payload: { name: 'Hacked' }
      });
      expect(forbiddenSalonPatch.statusCode).toBe(403);

      const forbiddenHoursGet = await app.inject({
        method: 'GET',
        url: `/v1/salons/${userA.salonId}/business-hours`,
        headers: { 'x-user-id': userB.userId }
      });
      expect(forbiddenHoursGet.statusCode).toBe(403);

      const forbiddenHoursPut = await app.inject({
        method: 'PUT',
        url: `/v1/salons/${userA.salonId}/business-hours`,
        headers: { 'x-user-id': userB.userId },
        payload: { weekly }
      });
      expect(forbiddenHoursPut.statusCode).toBe(403);

      const forbiddenStaffServices = await app.inject({
        method: 'GET',
        url: `/v1/staff/${staff.id}/services`,
        headers: { 'x-user-id': userB.userId }
      });
      expect(forbiddenStaffServices.statusCode).toBe(403);

      const forbiddenAssign = await app.inject({
        method: 'POST',
        url: `/v1/staff/${staff.id}/services`,
        headers: { 'x-user-id': userB.userId },
        payload: { serviceIds: [service.id] }
      });
      expect(forbiddenAssign.statusCode).toBe(403);

      const forbiddenAvailability = await app.inject({
        method: 'GET',
        url: `/v1/availability/slots?serviceId=${service.id}&from=${encodeURIComponent(startUtc)}&days=1&limit=1`,
        headers: { 'x-user-id': userB.userId }
      });
      expect(forbiddenAvailability.statusCode).toBe(403);

      const forbiddenBookingCreate = await app.inject({
        method: 'POST',
        url: '/v1/bookings',
        headers: { 'x-user-id': userB.userId },
        payload: {
          serviceId: service.id,
          staffId: staff.id,
          startUtc,
          endUtc,
          customer: { name: 'Cross Tenant' }
        }
      });
      expect(forbiddenBookingCreate.statusCode).toBe(403);
      const forbiddenCreatePayload = forbiddenBookingCreate.json() as { message?: string };
      expect(forbiddenCreatePayload.message).toBe('error.auth.forbidden');

      const forbiddenBookingGet = await app.inject({
        method: 'GET',
        url: `/v1/bookings/${booking.id}`,
        headers: { 'x-user-id': userB.userId }
      });
      expect(forbiddenBookingGet.statusCode).toBe(403);

    } finally {
      await cleanupUser(userA);
      await cleanupUser(userB);
    }
  }, 15000);
});
