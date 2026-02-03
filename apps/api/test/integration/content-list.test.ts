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
};

describe('content list endpoints', () => {
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

    return { userId: authUser.user.id, salonId, staffId, serviceId };
  }

  async function cleanup(seed: SeedResult) {
    const supabase = getSupabaseClient();
    await supabase.from('staff_profiles').delete().eq('id', seed.staffId);
    await supabase.from('services').delete().eq('id', seed.serviceId);
    await supabase.from('memberships').delete().eq('salon_id', seed.salonId);
    await supabase.from('users').delete().eq('id', seed.userId);
    await supabase.from('salons').delete().eq('id', seed.salonId);
    await supabase.auth.admin.deleteUser(seed.userId);
  }

  itIfSupabase('lists staff and services', async () => {
    const seed = await seedBase();
    try {
      const staffResponse = await app.inject({
        method: 'GET',
        url: '/v1/staff',
        headers: { 'x-user-id': seed.userId }
      });
      expect(staffResponse.statusCode).toBe(200);
      const staffBody = staffResponse.json() as { data: { id: string }[] };
      expect(staffBody.data.some((entry) => entry.id === seed.staffId)).toBe(true);

      const serviceResponse = await app.inject({
        method: 'GET',
        url: '/v1/services',
        headers: { 'x-user-id': seed.userId }
      });
      expect(serviceResponse.statusCode).toBe(200);
      const serviceBody = serviceResponse.json() as { data: { id: string }[] };
      expect(serviceBody.data.some((entry) => entry.id === seed.serviceId)).toBe(true);
    } finally {
      await cleanup(seed);
    }
  });
});
