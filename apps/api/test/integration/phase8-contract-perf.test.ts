import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { buildApp } from '../../src/server/build-app.ts';
import { getSupabaseClient } from '../../src/server/db.ts';
import { seedTestSalon, cleanupTestData, createTestBooking, generateTestCustomer } from '../test-utils.ts';

type OwnerSeed = {
  userId: string;
  salonId: string;
};

async function seedOwnerForSalon(salonId: string): Promise<OwnerSeed> {
  const supabase = getSupabaseClient();
  const email = `contract+${randomUUID()}@example.com`;
  const password = 'TestPass123!';

  const { data: authUser, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error || !authUser.user) {
    throw error ?? new Error('Failed to create auth user');
  }
  const userId = authUser.user.id;

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

  return { userId, salonId };
}

async function cleanupOwner(seed?: OwnerSeed) {
  const supabase = getSupabaseClient();
  if (!seed) return;
  await supabase.from('memberships').delete().eq('salon_id', seed.salonId).eq('user_id', seed.userId);
  await supabase.from('users').delete().eq('id', seed.userId);
  await supabase.auth.admin.deleteUser(seed.userId);
}

describe('contract: public and auth endpoints', () => {
  let app: ReturnType<typeof buildApp>;
  let testData: Awaited<ReturnType<typeof seedTestSalon>>;
  let owner: OwnerSeed | undefined;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('salons').select('id').limit(1);
    if (error) {
      throw new Error(`Supabase unavailable: ${error.message}`);
    }
    testData = await seedTestSalon();
    owner = await seedOwnerForSalon(testData.salonId);
  });

  afterAll(async () => {
    await cleanupOwner(owner);
    await cleanupTestData(testData.salonId);
    await app.close();
  });

  test('contract: public endpoints return 200', async () => {
    const salonResponse = await app.inject({
      method: 'GET',
      url: `/v1/public/salons/${testData.slug}`
    });
    expect(salonResponse.statusCode).toBe(200);

    const servicesResponse = await app.inject({
      method: 'GET',
      url: `/v1/public/salons/${testData.slug}/services`
    });
    expect(servicesResponse.statusCode).toBe(200);

    const staffResponse = await app.inject({
      method: 'GET',
      url: `/v1/public/salons/${testData.slug}/staff`
    });
    expect(staffResponse.statusCode).toBe(200);

    const availabilityResponse = await app.inject({
      method: 'GET',
      url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&days=1&limit=5`
    });
    expect(availabilityResponse.statusCode).toBe(200);
  });

  test('contract: protected endpoints require auth', async () => {
    const endpoints = [
      { method: 'GET', url: '/v1/services' },
      { method: 'GET', url: '/v1/bookings' },
      { method: 'POST', url: `/v1/staff/${testData.staffId}/time-off` }
    ] as const;

    for (const endpoint of endpoints) {
      const response = await app.inject(
        endpoint.method === 'POST'
          ? {
              method: endpoint.method,
              url: endpoint.url,
              headers: { 'Content-Type': 'application/json' },
              payload: {
                startUtc: new Date().toISOString(),
                endUtc: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                reason: 'contract-test'
              }
            }
          : {
              method: endpoint.method,
              url: endpoint.url
            }
      );
      expect([401, 403]).toContain(response.statusCode);
    }
  });

  test('contract: protected endpoints succeed with owner auth', async () => {
    const servicesResponse = await app.inject({
      method: 'GET',
      url: '/v1/services',
      headers: { 'x-user-id': owner.userId }
    });
    expect(servicesResponse.statusCode).toBe(200);

    const staffResponse = await app.inject({
      method: 'GET',
      url: '/v1/staff',
      headers: { 'x-user-id': owner.userId }
    });
    expect(staffResponse.statusCode).toBe(200);

    const bookingsResponse = await app.inject({
      method: 'GET',
      url: '/v1/bookings',
      headers: { 'x-user-id': owner.userId }
    });
    expect(bookingsResponse.statusCode).toBe(200);
  });
});

describe('perf: public booking endpoints', () => {
  let app: ReturnType<typeof buildApp>;
  let testData: Awaited<ReturnType<typeof seedTestSalon>>;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('salons').select('id').limit(1);
    if (error) {
      throw new Error(`Supabase unavailable: ${error.message}`);
    }
    testData = await seedTestSalon();
  });

  afterAll(async () => {
    await cleanupTestData(testData.salonId);
    await app.close();
  });

  test('perf: availability returns within 1000ms', async () => {
    const start = performance.now();
    const response = await app.inject({
      method: 'GET',
      url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&days=7&limit=50`
    });
    const durationMs = performance.now() - start;
    expect(response.statusCode).toBe(200);
    expect(durationMs).toBeLessThan(1000);
  });

  test('perf: booking creation + public fetch within 1500ms', async () => {
    const start = performance.now();
    const booking = await createTestBooking(app, testData, generateTestCustomer(), { limit: 10 });
    const tokenResponse = await app.inject({
      method: 'GET',
      url: `/v1/public/bookings/${booking.booking.id}`,
      query: { token: booking.bookingToken }
    });
    const durationMs = performance.now() - start;
    expect(tokenResponse.statusCode).toBe(200);
    expect(durationMs).toBeLessThan(1500);
  });
});
