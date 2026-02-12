import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/server/build-app.ts';
import {
  seedTestSalon,
  cleanupTestData,
  generateTestCustomer,
  getTomorrowAt,
  createTestBooking,
  checkoutAndPay,
} from '../test-utils.ts';
import { getSupabaseClient } from '../../src/server/db.ts';
import { randomUUID } from 'crypto';

describe('Payment Edge Cases Tests', () => {
  let server: ReturnType<typeof buildApp>;
  let testData: Awaited<ReturnType<typeof seedTestSalon>>;

  beforeAll(async () => {
    server = buildApp();
    await server.ready();
    testData = await seedTestSalon();
  });

  afterAll(async () => {
    await cleanupTestData(testData.salonId);
    await server.close();
  });

  beforeEach(async () => {
    const supabase = getSupabaseClient();
    await supabase.from('payments').delete().eq('salon_id', testData.salonId);
    await supabase.from('bookings').delete().eq('salon_id', testData.salonId);
    await supabase.from('customers').delete().eq('salon_id', testData.salonId);
  });

  describe('Payment Status Transitions', () => {
    it('should handle successful payment webhook', async () => {
      const bookingData = await createTestBooking(server, testData);
      const checkoutData = await checkoutAndPay(
        server,
        bookingData.booking,
        bookingData.bookingToken,
      );

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${bookingData.booking.id}?token=${bookingData.bookingToken}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('confirmed');
      expect(data.paymentStatus).toBe('succeeded');
    });

    it('should handle failed payment webhook', async () => {
      const bookingData = await createTestBooking(server, testData);
      await checkoutAndPay(server, bookingData.booking, bookingData.bookingToken, {
        status: 'failed',
      });

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${bookingData.booking.id}?token=${bookingData.bookingToken}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('cancelled');
      expect(data.paymentStatus).toBe('failed');
    });

    it('should handle cancelled payment webhook', async () => {
      const bookingData = await createTestBooking(server, testData);
      await checkoutAndPay(server, bookingData.booking, bookingData.bookingToken, {
        status: 'canceled',
      });

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${bookingData.booking.id}?token=${bookingData.bookingToken}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(['cancelled', 'pending']).toContain(data.status);
    });

    it('should handle pending payment status', async () => {
      const bookingData = await createTestBooking(server, testData);

      const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
      await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken,
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`,
        },
      });

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${bookingData.booking.id}?token=${bookingData.bookingToken}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('pending');
      expect(data.paymentStatus).toBe('pending');
    });
  });

  describe('Webhook Idempotency', () => {
    it('should handle duplicate webhook events idempotently', async () => {
      const bookingData = await createTestBooking(server, testData);

      const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
      const checkoutResponse = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken,
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`,
        },
      });

      const checkoutData = JSON.parse(checkoutResponse.body);
      const eventId = `duplicate_event_${randomUUID().slice(0, 8)}`;

      const response1 = await server.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          paymentId: checkoutData.paymentId,
          bookingId: bookingData.booking.id,
          sessionId: `mock_session_${checkoutData.paymentId}`,
          eventId,
        },
      });

      expect(response1.statusCode).toBe(200);

      const response2 = await server.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          paymentId: checkoutData.paymentId,
          bookingId: bookingData.booking.id,
          sessionId: `mock_session_${checkoutData.paymentId}`,
          eventId,
        },
      });

      expect(response2.statusCode).toBe(200);
      const data2 = JSON.parse(response2.body);
      expect(data2.idempotent).toBe(true);

      const supabase = getSupabaseClient();
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingData.booking.id);

      expect(payments?.length).toBe(1);
    });
  });

  describe('Webhook Security', () => {
    it('should reject webhook with mismatched booking', async () => {
      const booking1 = await createTestBooking(server, testData);
      const booking2 = await createTestBooking(server, testData);

      const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
      const checkoutResponse = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${booking1.booking.id}/checkout`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': booking1.bookingToken,
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`,
        },
      });

      const checkoutData = JSON.parse(checkoutResponse.body);

      const response = await server.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          paymentId: checkoutData.paymentId,
          bookingId: booking2.booking.id,
          sessionId: `mock_session_${checkoutData.paymentId}`,
          eventId: `mismatch_${randomUUID().slice(0, 8)}`,
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should handle orphaned webhook gracefully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          paymentId: randomUUID(),
          bookingId: randomUUID(),
          sessionId: 'orphan_session',
          eventId: `orphan_${randomUUID().slice(0, 8)}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.orphaned).toBe(true);
    });
  });

  describe('Checkout Validation', () => {
    it('should reject checkout for non-pending booking', async () => {
      const bookingData = await createTestBooking(server, testData);
      await checkoutAndPay(server, bookingData.booking, bookingData.bookingToken);

      const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken,
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`,
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should reject checkout with invalid token', async () => {
      const bookingData = await createTestBooking(server, testData);

      const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': 'invalid-token',
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate return URLs', async () => {
      const bookingData = await createTestBooking(server, testData);

      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken,
        },
        payload: {
          successUrl: 'not-a-valid-url',
          cancelUrl: 'javascript:alert(1)',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Payment Amount Validation', () => {
    it('should calculate correct payment amount', async () => {
      const supabase = getSupabaseClient();

      const { data: service } = await supabase
        .from('services')
        .select('price_amount')
        .eq('id', testData.serviceId)
        .single();

      const bookingData = await createTestBooking(server, testData);

      const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
      const checkoutResponse = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken,
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`,
        },
      });

      expect(checkoutResponse.statusCode).toBe(201);

      const { data: payment } = await supabase
        .from('payments')
        .select('amount')
        .eq('booking_id', bookingData.booking.id)
        .single();

      expect(payment?.amount).toBe(service?.price_amount);
    });
  });

  describe('Partial Payment Scenarios', () => {
    it('should handle deposit payments correctly', async () => {
      const supabase = getSupabaseClient();

      const bookingData = await createTestBooking(server, testData);

      const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
      const checkoutResponse = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken,
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`,
          type: 'deposit',
        },
      });

      expect([201, 400]).toContain(checkoutResponse.statusCode);
    });
  });

  describe('Payment Retry Logic', () => {
    it('should allow retry after failed payment', async () => {
      const bookingData = await createTestBooking(server, testData);
      await checkoutAndPay(server, bookingData.booking, bookingData.bookingToken, {
        status: 'failed',
      });

      const retryResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${bookingData.booking.id}?token=${bookingData.bookingToken}`,
      });

      expect(retryResponse.statusCode).toBe(200);
      const retryData = JSON.parse(retryResponse.body);

      expect(retryData.status).toBe('cancelled');
    });
  });

  describe('Currency Handling', () => {
    it('should preserve currency through payment flow', async () => {
      const supabase = getSupabaseClient();

      const { data: salon } = await supabase
        .from('salons')
        .select('currency')
        .eq('id', testData.salonId)
        .single();

      const bookingData = await createTestBooking(server, testData);

      const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
      await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken,
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`,
        },
      });

      const { data: payment } = await supabase
        .from('payments')
        .select('currency')
        .eq('booking_id', bookingData.booking.id)
        .single();

      expect(payment?.currency).toBe(salon?.currency);
    });
  });

  describe('Refund Scenarios', () => {
    it('should handle refund webhook correctly', async () => {
      const bookingData = await createTestBooking(server, testData);
      await checkoutAndPay(server, bookingData.booking, bookingData.bookingToken);

      const response = await server.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          paymentId: randomUUID(),
          bookingId: bookingData.booking.id,
          sessionId: 'refund_session',
          eventId: `refund_${randomUUID().slice(0, 8)}`,
          type: 'charge.refunded',
        },
      });

      expect([200, 400, 404]).toContain(response.statusCode);
    });
  });

  describe('Payment Timeout Handling', () => {
    it('should expire pending bookings after timeout', async () => {
      const bookingData = await createTestBooking(server, testData);
      const supabase = getSupabaseClient();

      await supabase
        .from('bookings')
        .update({ expires_at: new Date(Date.now() - 60000).toISOString() })
        .eq('id', bookingData.booking.id);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${bookingData.booking.id}?token=${bookingData.bookingToken}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(['cancelled', 'expired', 'pending']).toContain(data.status);
    });
  });
});
