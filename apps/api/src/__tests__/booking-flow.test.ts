import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { FastifyInstance } from 'fastify';

const shouldRun =
  process.env.ALLOW_INTEGRATION_TESTS === 'true' &&
  !!process.env.SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

const run = shouldRun ? describe : describe.skip;

run('booking flow integration', () => {
  let app: FastifyInstance | null = null;
  let supabase: ReturnType<typeof createClient>;
  let stripe: Stripe;

  type Fixture = {
    salonId: string;
    staffId: string;
    serviceId: string;
    customerId: string;
  };

  let fixture: Fixture | null = null;

  beforeAll(async () => {
    process.env.PAYMENTS_USE_MOCK = 'true';
    process.env.STRIPE_SECRET_KEY ??= 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_dummy';

    const mod = await import('../server/build-app.js');
    app = mod.buildApp();

    supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
  });

  beforeEach(async () => {
    const slug = `test-salon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { data: salon, error: salonError } = await supabase
      .from('salons')
      .insert({ name: 'Test Salon', slug, timezone: 'Europe/Copenhagen' })
      .select('id')
      .single();

    if (salonError || !salon) {
      throw salonError ?? new Error('Failed to create salon');
    }

    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .insert({ salon_id: salon.id, display_name: 'Test Stylist', role: 'staff' })
      .select('id')
      .single();

    if (staffError || !staff) {
      throw staffError ?? new Error('Failed to create staff');
    }

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert({
        salon_id: salon.id,
        name: 'Test Service',
        duration_minutes: 60,
        price_amount: 500,
        currency: 'DKK'
      })
      .select('id')
      .single();

    if (serviceError || !service) {
      throw serviceError ?? new Error('Failed to create service');
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        salon_id: salon.id,
        name: 'Test Customer',
        email: 'customer@nemsalon.test',
        phone: '+4511122233'
      })
      .select('id')
      .single();

    if (customerError || !customer) {
      throw customerError ?? new Error('Failed to create customer');
    }

    fixture = {
      salonId: salon.id,
      staffId: staff.id,
      serviceId: service.id,
      customerId: customer.id
    };
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  afterEach(async () => {
    if (!fixture?.salonId) return;
    await supabase.from('salons').delete().eq('id', fixture.salonId);
    fixture = null;
  });

  test('prevents overlapping bookings for the same staff', async () => {
    if (!app) return;
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const first = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      payload: {
        salonId: fixture!.salonId,
        staffId: fixture!.staffId,
        serviceId: fixture!.serviceId,
        customerId: fixture!.customerId,
        startTime: start.toISOString(),
        endTime: end.toISOString()
      }
    });

    expect(first.statusCode).toBe(201);

    const overlap = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      payload: {
        salonId: fixture!.salonId,
        staffId: fixture!.staffId,
        serviceId: fixture!.serviceId,
        customerId: fixture!.customerId,
        startTime: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
        endTime: new Date(end.getTime() + 30 * 60 * 1000).toISOString()
      }
    });

    expect(overlap.statusCode).toBe(409);
  });

  test('happy path booking -> checkout -> webhook confirmation', async () => {
    if (!app) return;
    const start = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 4 * 60 * 60 * 1000);

    const bookingRes = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      payload: {
        salonId: fixture!.salonId,
        staffId: fixture!.staffId,
        serviceId: fixture!.serviceId,
        customerId: fixture!.customerId,
        startTime: start.toISOString(),
        endTime: end.toISOString()
      }
    });

    expect(bookingRes.statusCode).toBe(201);
    const booking = bookingRes.json();

    const checkoutRes = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/checkout`,
      payload: {
        provider: 'stripe',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      }
    });

    expect(checkoutRes.statusCode).toBe(201);
    const checkout = checkoutRes.json();

    const eventPayload = JSON.stringify({
      id: `evt_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          metadata: {
            bookingId: booking.id,
            paymentId: checkout.paymentId
          }
        }
      }
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload: eventPayload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!
    });

    const webhookRes = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/stripe',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signature
      },
      payload: eventPayload
    });

    expect(webhookRes.statusCode).toBe(200);

    const { data: bookingRow } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', booking.id)
      .single();

    expect(bookingRow?.status).toBe('confirmed');

    const { data: outbox } = await supabase
      .from('notification_outbox')
      .select('id')
      .eq('booking_id', booking.id);

    expect(outbox?.length).toBe(2);
  });

  test('stripe webhook is idempotent for repeated events', async () => {
    if (!app) return;
    const start = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 6 * 60 * 60 * 1000);

    const bookingRes = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      payload: {
        salonId: fixture!.salonId,
        staffId: fixture!.staffId,
        serviceId: fixture!.serviceId,
        customerId: fixture!.customerId,
        startTime: start.toISOString(),
        endTime: end.toISOString()
      }
    });

    expect(bookingRes.statusCode).toBe(201);
    const booking = bookingRes.json();

    const checkoutRes = await app.inject({
      method: 'POST',
      url: `/v1/bookings/${booking.id}/checkout`,
      payload: {
        provider: 'stripe',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      }
    });

    expect(checkoutRes.statusCode).toBe(201);
    const checkout = checkoutRes.json();

    const eventPayload = JSON.stringify({
      id: `evt_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          metadata: {
            bookingId: booking.id,
            paymentId: checkout.paymentId
          }
        }
      }
    });

    const signature = stripe.webhooks.generateTestHeaderString({
      payload: eventPayload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!
    });

    const sendWebhook = () =>
      app!.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signature
        },
        payload: eventPayload
      });

    const first = await sendWebhook();
    const second = await sendWebhook();

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);

    const { data: outbox } = await supabase
      .from('notification_outbox')
      .select('id')
      .eq('booking_id', booking.id);

    expect(outbox?.length).toBe(2);
  });
});
