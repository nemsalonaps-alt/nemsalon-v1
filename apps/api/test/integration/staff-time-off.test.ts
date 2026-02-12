import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { buildApp } from '../../src/server/build-app.ts';
import { getSupabaseClient } from '../../src/server/db.ts';

type SeedResult = {
  userId: string;
  salonId: string;
  staffId: string;
  otherStaffId: string;
};

describe('staff time-off endpoints', () => {
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
    const email = `staff+${randomUUID()}@example.com`;
    const password = 'TestPass123!';
    const salonId = randomUUID();
    const staffId = randomUUID();
    const otherStaffId = randomUUID();

    const { data: authUser, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !authUser.user) {
      throw error ?? new Error('Failed to create auth user');
    }

    await supabase.from('salons').insert({
      id: salonId,
      name: 'Test Salon',
      timezone: 'Europe/Copenhagen',
      locale: 'da-DK',
      currency: 'DKK',
      status: 'active',
    });
    await supabase.from('users').insert({
      id: authUser.user.id,
      email,
      primary_salon_id: salonId,
    });
    await supabase.from('memberships').insert({
      salon_id: salonId,
      user_id: authUser.user.id,
      role: 'staff',
      active: true,
    });
    await supabase.from('staff_profiles').insert({
      id: staffId,
      salon_id: salonId,
      user_id: authUser.user.id,
      display_name: 'Test Staff',
      role: 'staff',
      active: true,
    });
    await supabase.from('staff_profiles').insert({
      id: otherStaffId,
      salon_id: salonId,
      display_name: 'Other Staff',
      role: 'staff',
      active: true,
    });

    return { userId: authUser.user.id, salonId, staffId, otherStaffId };
  }

  async function cleanup(seed: SeedResult) {
    const supabase = getSupabaseClient();
    await supabase.from('staff_time_off').delete().eq('salon_id', seed.salonId);
    await supabase.from('staff_profiles').delete().eq('id', seed.staffId);
    await supabase.from('staff_profiles').delete().eq('id', seed.otherStaffId);
    await supabase.from('memberships').delete().eq('salon_id', seed.salonId);
    await supabase.from('users').delete().eq('id', seed.userId);
    await supabase.from('salons').delete().eq('id', seed.salonId);
    await supabase.auth.admin.deleteUser(seed.userId);
  }

  it('creates staff time-off and returns the entry', async () => {
    const seed = await seedBase();
    try {
      const start = new Date();
      start.setDate(start.getDate() + 2);
      start.setHours(10, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const response = await app.inject({
        method: 'POST',
        url: `/v1/staff/${seed.staffId}/time-off`,
        headers: { 'x-user-id': seed.userId, 'Content-Type': 'application/json' },
        payload: {
          startUtc: start.toISOString(),
          endUtc: end.toISOString(),
          reason: 'Integration test',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json() as { id: string; staffId: string; reason?: string };
      expect(body.staffId).toBe(seed.staffId);
      expect(body.reason).toBe('Integration test');
    } finally {
      await cleanup(seed);
    }
  });

  it('rejects staff time-off for another staff id', async () => {
    const seed = await seedBase();
    try {
      const start = new Date();
      start.setDate(start.getDate() + 2);
      start.setHours(10, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      const response = await app.inject({
        method: 'POST',
        url: `/v1/staff/${seed.otherStaffId}/time-off`,
        headers: { 'x-user-id': seed.userId, 'Content-Type': 'application/json' },
        payload: {
          startUtc: start.toISOString(),
          endUtc: end.toISOString(),
        },
      });

      expect(response.statusCode).toBe(403);
    } finally {
      await cleanup(seed);
    }
  });
});
