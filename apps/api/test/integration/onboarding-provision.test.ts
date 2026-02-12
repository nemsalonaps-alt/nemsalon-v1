import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { buildApp } from '../../src/server/build-app.ts';
import { getSupabaseClient } from '../../src/server/db.ts';

// Always run tests (setup.ts handles env loading)
const itIfSupabase = test;

type AuthHeaders = Record<string, string>;

describe('onboarding provisioning', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createAuthUser() {
    const supabase = getSupabaseClient();
    const email = `test+${randomUUID()}@example.com`;
    const password = 'TestPass123!';
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'owner'
      }
    });

    if (error || !created.user) {
      throw error ?? new Error('Failed to create auth user');
    }

    let headers: AuthHeaders = {
      'x-user-id': created.user.id,
      'x-user-email': email
    };

    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signIn.error && signIn.data.session?.access_token) {
      headers = { authorization: `Bearer ${signIn.data.session.access_token}` };
    }

    return { userId: created.user.id, email, headers };
  }

  async function cleanupUser(userId: string, salonId?: string | null) {
    const supabase = getSupabaseClient();
    if (salonId) {
      await supabase.from('salons').delete().eq('id', salonId);
    }
    await supabase.auth.admin.deleteUser(userId);
  }

  itIfSupabase('auto-provisions salon on /v1/auth/me and is idempotent', async () => {
    const { userId, headers } = await createAuthUser();
    try {
      const first = await app.inject({ method: 'GET', url: '/v1/auth/me', headers });
      expect(first.statusCode).toBe(200);
      const firstPayload = first.json() as { primarySalonId?: string };
      expect(firstPayload.primarySalonId).toBeTruthy();

      const second = await app.inject({ method: 'GET', url: '/v1/auth/me', headers });
      expect(second.statusCode).toBe(200);
      const secondPayload = second.json() as { primarySalonId?: string };
      expect(secondPayload.primarySalonId).toBe(firstPayload.primarySalonId);

      await cleanupUser(userId, firstPayload.primarySalonId ?? null);
    } catch (error) {
      await cleanupUser(userId);
      throw error;
    }
  });

  itIfSupabase('stores and returns salon business hours', async () => {
    const { userId, headers } = await createAuthUser();
    let salonId: string | null = null;
    try {
      const me = await app.inject({ method: 'GET', url: '/v1/auth/me', headers });
      const mePayload = me.json() as { primarySalonId?: string };
      salonId = mePayload.primarySalonId ?? null;
      expect(salonId).toBeTruthy();

      const weekly = [
        { day: 'mon', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'tue', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'wed', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'thu', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'fri', startTime: '09:00', endTime: '17:00', enabled: true },
        { day: 'sat', startTime: '09:00', endTime: '17:00', enabled: false },
        { day: 'sun', startTime: '09:00', endTime: '17:00', enabled: false }
      ];

      const update = await app.inject({
        method: 'PUT',
        url: `/v1/salons/${salonId}/business-hours`,
        headers,
        payload: { weekly }
      });
      expect(update.statusCode).toBe(200);

      const get = await app.inject({
        method: 'GET',
        url: `/v1/salons/${salonId}/business-hours`,
        headers
      });
      expect(get.statusCode).toBe(200);
      const getPayload = get.json() as { weekly: typeof weekly };
      expect(getPayload.weekly).toHaveLength(7);

      await cleanupUser(userId, salonId);
    } catch (error) {
      await cleanupUser(userId, salonId);
      throw error;
    }
  });

  itIfSupabase('assigns services to staff (idempotent)', async () => {
    const { userId, headers } = await createAuthUser();
    let salonId: string | null = null;
    try {
      const me = await app.inject({ method: 'GET', url: '/v1/auth/me', headers });
      const mePayload = me.json() as { primarySalonId?: string };
      salonId = mePayload.primarySalonId ?? null;
      expect(salonId).toBeTruthy();

      const staffRes = await app.inject({
        method: 'POST',
        url: '/v1/staff',
        headers,
        payload: { name: 'Test Staff', role: 'owner' }
      });
      expect(staffRes.statusCode).toBe(201);
      const staff = staffRes.json() as { id: string };

      const serviceRes = await app.inject({
        method: 'POST',
        url: '/v1/services',
        headers,
        payload: {
          name: 'Test Service',
          durationMinutes: 30,
          bufferMinutes: 0,
          price: 500,
          currency: 'DKK'
        }
      });
      expect(serviceRes.statusCode).toBe(201);
      const service = serviceRes.json() as { id: string };

      const assign = await app.inject({
        method: 'POST',
        url: `/v1/staff/${staff.id}/services`,
        headers,
        payload: { serviceIds: [service.id] }
      });
      expect(assign.statusCode).toBe(200);

      const assignAgain = await app.inject({
        method: 'POST',
        url: `/v1/staff/${staff.id}/services`,
        headers,
        payload: { serviceIds: [service.id] }
      });
      expect(assignAgain.statusCode).toBe(200);

      const list = await app.inject({
        method: 'GET',
        url: `/v1/staff/${staff.id}/services`,
        headers
      });
      const listPayload = list.json() as { serviceIds: string[] };
      expect(listPayload.serviceIds).toContain(service.id);

      await cleanupUser(userId, salonId);
    } catch (error) {
      await cleanupUser(userId, salonId);
      throw error;
    }
  });
});
