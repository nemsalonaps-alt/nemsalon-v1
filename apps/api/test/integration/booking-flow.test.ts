import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { buildApp } from '../../src/server/build-app.ts';
import { getSupabaseClient } from '../../src/server/db.ts';

const allowIntegration = process.env.ALLOW_INTEGRATION_TESTS === 'true';
const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const itIfSupabase = allowIntegration && hasSupabase ? test : test.skip;
const useMockPayments = process.env.PAYMENTS_USE_MOCK === 'true';

function buildWebhookRequest(paymentId: string, bookingId: string) {
  if (useMockPayments) {
    return {
      payload: { paymentId, bookingId },
      headers: { 'content-type': 'application/json' }
    };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    throw new Error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET for Stripe tests.');
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
  const payload = JSON.stringify({
    id: `evt_${randomUUID()}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${randomUUID()}`,
        metadata: {
          paymentId,
          bookingId
        }
      }
    }
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret
  });

  return {
    payload,
    headers: { 'content-type': 'application/json', 'stripe-signature': signature }
  };
}

async function seedSalonData(
  supabase: ReturnType<typeof getSupabaseClient>,
  customerOverrides?: { email?: string; phone?: string }
) {
  const salonId = randomUUID();
  const staffId = randomUUID();
  const serviceId = randomUUID();
  const customerId = randomUUID();
  const email = `test+${randomUUID()}@example.com`;
  const password = 'TestPass123!';

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (authError || !authUser.user) {
    throw authError ?? new Error('Failed to create auth user');
  }

  await supabase.from('salons').insert({
    id: salonId,
    name: 'Test Salon',
    timezone: 'Europe/Copenhagen',
    locale: 'da-DK',
    currency: 'DKK'
  });
  await supabase.from('users').insert({ id: authUser.user.id, email, primary_salon_id: salonId });
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
    email: customerOverrides?.email,
    phone: customerOverrides?.phone
  });

  return { salonId, staffId, serviceId, customerId, userId: authUser.user.id };
}

describe('booking flow', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  itIfSupabase('prevents overlapping bookings for same staff', async () => {
    const supabase = getSupabaseClient();
    const { salonId, staffId, serviceId, customerId, userId } = await seedSalonData(supabase);

    const startTime = '2025-01-06T08:00:00.000Z';

    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: { 'x-user-id': userId },
      payload: {
        customerId,
        staffId,
        serviceId,
        startUtc: startTime
      }
    });

    expect(createResponse.statusCode).toBe(201);

    const overlapResponse = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: { 'x-user-id': userId },
      payload: {
        customerId,
        staffId,
        serviceId,
        startUtc: startTime
      }
    });

    expect(overlapResponse.statusCode).toBe(409);

    await supabase.from('bookings').delete().eq('salon_id', salonId);
    await supabase.from('customers').delete().eq('salon_id', salonId);
    await supabase.from('services').delete().eq('salon_id', salonId);
    await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
    await supabase.from('salon_business_hours').delete().eq('salon_id', salonId);
    await supabase.from('salons').delete().eq('id', salonId);
  });

  itIfSupabase('webhook is idempotent', async () => {
    const supabase = getSupabaseClient();
    const { salonId, staffId, serviceId, customerId, userId } = await seedSalonData(supabase, {
      email: 'customer@example.com',
      phone: '+4512345678'
    });

    const startTime = '2025-01-06T08:00:00.000Z';

    const bookingResponse = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: { 'x-user-id': userId },
      payload: {
        customerId,
        staffId,
        serviceId,
        startUtc: startTime
      }
    });
    const booking = bookingResponse.json() as { id: string };

    const checkoutResponse = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/checkout`,
      headers: { 'x-user-id': userId },
      payload: {
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      }
    });

    expect(checkoutResponse.statusCode).toBe(201);
    const checkout = checkoutResponse.json() as { paymentId: string };

    const webhookRequest = buildWebhookRequest(checkout.paymentId, booking.id);

    const firstWebhook = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/stripe',
      payload: webhookRequest.payload,
      headers: webhookRequest.headers
    });
    const secondWebhook = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/stripe',
      payload: webhookRequest.payload,
      headers: webhookRequest.headers
    });

    expect(firstWebhook.statusCode).toBe(200);
    expect(secondWebhook.statusCode).toBe(200);

    const { data: outbox } = await supabase
      .from('notification_outbox')
      .select('*')
      .eq('booking_id', booking.id);

    expect(outbox?.length).toBe(2);

    await supabase.from('notification_outbox').delete().eq('booking_id', booking.id);
    await supabase.from('payments').delete().eq('booking_id', booking.id);
    await supabase.from('bookings').delete().eq('salon_id', salonId);
    await supabase.from('customers').delete().eq('salon_id', salonId);
    await supabase.from('services').delete().eq('salon_id', salonId);
    await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
    await supabase.from('salon_business_hours').delete().eq('salon_id', salonId);
    await supabase.from('salons').delete().eq('id', salonId);
  });

  itIfSupabase('confirms booking and queues notifications', async () => {
    const supabase = getSupabaseClient();
    const { salonId, staffId, serviceId, customerId, userId } = await seedSalonData(supabase, {
      email: 'customer2@example.com',
      phone: '+4512345679'
    });

    const startTime = '2025-01-06T08:00:00.000Z';

    const bookingResponse = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: { 'x-user-id': userId },
      payload: {
        customerId,
        staffId,
        serviceId,
        startUtc: startTime
      }
    });
    const booking = bookingResponse.json() as { id: string };

    const checkoutResponse = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/checkout`,
      headers: { 'x-user-id': userId },
      payload: {
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      }
    });

    const checkout = checkoutResponse.json() as { paymentId: string };

    const webhookRequest = buildWebhookRequest(checkout.paymentId, booking.id);

    await app.inject({
      method: 'POST',
      url: '/v1/webhooks/stripe',
      payload: webhookRequest.payload,
      headers: webhookRequest.headers
    });

    const { data: bookings } = await supabase.from('bookings').select('*').eq('id', booking.id);
    const { data: outbox } = await supabase
      .from('notification_outbox')
      .select('*')
      .eq('booking_id', booking.id);

    expect(bookings?.[0]?.status).toBe('confirmed');
    expect(outbox?.length).toBe(2);

    await supabase.from('notification_outbox').delete().eq('booking_id', booking.id);
    await supabase.from('payments').delete().eq('booking_id', booking.id);
    await supabase.from('bookings').delete().eq('salon_id', salonId);
    await supabase.from('customers').delete().eq('salon_id', salonId);
    await supabase.from('services').delete().eq('salon_id', salonId);
    await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
    await supabase.from('salon_business_hours').delete().eq('salon_id', salonId);
    await supabase.from('salons').delete().eq('id', salonId);
  });

  itIfSupabase('checkout is idempotent', async () => {
    const supabase = getSupabaseClient();
    const { salonId, staffId, serviceId, customerId, userId } = await seedSalonData(supabase);

    const bookingResponse = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: { 'x-user-id': userId },
      payload: {
        customerId,
        staffId,
        serviceId,
        startUtc: '2025-01-06T12:00:00.000Z'
      }
    });
    const booking = bookingResponse.json() as { id: string };

    const checkoutResponse = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/checkout`,
      headers: { 'x-user-id': userId, 'idempotency-key': 'checkout-test' },
      payload: {
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      }
    });
    expect(checkoutResponse.statusCode).toBe(201);
    const first = checkoutResponse.json() as { paymentId: string; checkoutUrl: string };

    const secondResponse = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/checkout`,
      headers: { 'x-user-id': userId, 'idempotency-key': 'checkout-test' },
      payload: {
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      }
    });
    expect(secondResponse.statusCode).toBe(201);
    const second = secondResponse.json() as { paymentId: string; checkoutUrl: string };

    expect(second.paymentId).toBe(first.paymentId);
    expect(second.checkoutUrl).toBe(first.checkoutUrl);

    await supabase.from('payments').delete().eq('booking_id', booking.id);
    await supabase.from('bookings').delete().eq('salon_id', salonId);
    await supabase.from('customers').delete().eq('salon_id', salonId);
    await supabase.from('services').delete().eq('salon_id', salonId);
    await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
    await supabase.from('salon_business_hours').delete().eq('salon_id', salonId);
    await supabase.from('salons').delete().eq('id', salonId);
  });

  itIfSupabase('refund is idempotent and tenant scoped', async () => {
    const supabase = getSupabaseClient();
    const { salonId, staffId, serviceId, customerId, userId } = await seedSalonData(supabase);
    const other = await seedSalonData(supabase);

    const bookingResponse = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      headers: { 'x-user-id': userId },
      payload: {
        customerId,
        staffId,
        serviceId,
        startUtc: '2025-01-06T14:00:00.000Z'
      }
    });
    const booking = bookingResponse.json() as { id: string };

    const checkoutResponse = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/checkout`,
      headers: { 'x-user-id': userId },
      payload: {
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      }
    });
    const checkout = checkoutResponse.json() as { paymentId: string };

    const webhookRequest = buildWebhookRequest(checkout.paymentId, booking.id);
    await app.inject({
      method: 'POST',
      url: '/v1/webhooks/stripe',
      payload: webhookRequest.payload,
      headers: webhookRequest.headers
    });

    const forbiddenRefund = await app.inject({
      method: 'POST',
      url: `/v1/payments/${checkout.paymentId}/refund`,
      headers: { 'x-user-id': other.userId }
    });
    expect(forbiddenRefund.statusCode).toBe(403);

    const refundResponse = await app.inject({
      method: 'POST',
      url: `/v1/payments/${checkout.paymentId}/refund`,
      headers: { 'x-user-id': userId, 'idempotency-key': 'refund-test' }
    });
    expect(refundResponse.statusCode).toBe(200);

    const secondRefund = await app.inject({
      method: 'POST',
      url: `/v1/payments/${checkout.paymentId}/refund`,
      headers: { 'x-user-id': userId, 'idempotency-key': 'refund-test' }
    });
    expect(secondRefund.statusCode).toBe(200);

    await supabase.from('payments').delete().eq('booking_id', booking.id);
    await supabase.from('bookings').delete().eq('salon_id', salonId);
    await supabase.from('customers').delete().eq('salon_id', salonId);
    await supabase.from('services').delete().eq('salon_id', salonId);
    await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
    await supabase.from('salon_business_hours').delete().eq('salon_id', salonId);
    await supabase.from('salons').delete().eq('id', salonId);

    await supabase.from('payments').delete().eq('salon_id', other.salonId);
    await supabase.from('bookings').delete().eq('salon_id', other.salonId);
    await supabase.from('customers').delete().eq('salon_id', other.salonId);
    await supabase.from('services').delete().eq('salon_id', other.salonId);
    await supabase.from('staff_profiles').delete().eq('salon_id', other.salonId);
    await supabase.from('salon_business_hours').delete().eq('salon_id', other.salonId);
    await supabase.from('salons').delete().eq('id', other.salonId);
  });
});
