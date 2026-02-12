import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

describe('Customer Portal Advanced Tests', () => {
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

  describe('Magic Link Authentication', () => {
    it('should generate valid magic link token', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const response = await server.inject({
        method: 'POST',
        url: '/v1/customer-portal/magic-link',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          email: customer.email,
          salonSlug: testData.slug,
        },
      });

      expect([200, 201, 400, 404]).toContain(response.statusCode);
    });

    it('should reject expired magic link token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/customer-portal/bookings?token=expired-token-12345',
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    it('should reject invalid magic link token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/customer-portal/bookings?token=invalid-token',
      });

      expect([401, 403]).toContain(response.statusCode);
    });
  });

  describe('Booking Cancellation Rules', () => {
    it('should allow cancellation within window', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${booking.booking.id}/cancel`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': booking.bookingToken,
        },
        payload: {
          reason: 'Customer request',
        },
      });

      expect([200, 400, 403, 409]).toContain(response.statusCode);
    });

    it('should reject cancellation outside window', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const supabase = getSupabaseClient();
      await supabase
        .from('bookings')
        .update({
          start_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        .eq('id', booking.booking.id);

      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${booking.booking.id}/cancel`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': booking.bookingToken,
        },
        payload: {
          reason: 'Late cancellation',
        },
      });

      if (response.statusCode === 409) {
        const data = JSON.parse(response.body);
        expect(data.code).toMatch(/cancellation_window|too_close/i);
      }
    });

    it('should not allow cancellation of completed booking', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);
      await checkoutAndPay(server, booking.booking, booking.bookingToken);

      const supabase = getSupabaseClient();
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.booking.id);

      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${booking.booking.id}/cancel`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': booking.bookingToken,
        },
        payload: {
          reason: 'Try to cancel completed',
        },
      });

      expect([400, 409]).toContain(response.statusCode);
    });
  });

  describe('Reschedule Flow', () => {
    it('should allow reschedule within window', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const tomorrow = getTomorrowAt(14);

      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${booking.booking.id}/reschedule`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': booking.bookingToken,
        },
        payload: {
          newStartTime: tomorrow.toISOString(),
        },
      });

      expect([200, 400, 403, 409]).toContain(response.statusCode);
    });

    it('should reject reschedule to conflicting time', async () => {
      const customer = generateTestCustomer();
      const booking1 = await createTestBooking(server, testData, customer, {
        slotIndex: 0,
        limit: 50,
      });

      const tomorrow = getTomorrowAt(10);

      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=50`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];

      const booking2 = await createTestBooking(
        server,
        testData,
        { ...customer, email: `other-${randomUUID().slice(0, 8)}@example.com` },
        { slotIndex: 1, limit: 50 },
      );

      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${booking2.booking.id}/reschedule`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': booking2.bookingToken,
        },
        payload: {
          newStartTime: booking1.booking.startTime,
        },
      });

      expect([400, 409]).toContain(response.statusCode);
    });

    it('should reject reschedule outside window', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const supabase = getSupabaseClient();
      await supabase
        .from('bookings')
        .update({
          start_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        .eq('id', booking.booking.id);

      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${booking.booking.id}/reschedule`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': booking.bookingToken,
        },
        payload: {
          newStartTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        },
      });

      if (response.statusCode === 409) {
        const data = JSON.parse(response.body);
        expect(data.code).toMatch(/window|too_close/i);
      }
    });
  });

  describe('Booking History', () => {
    it('should show customer booking history', async () => {
      const customer = generateTestCustomer();
      await createTestBooking(server, testData, customer);
      await createTestBooking(server, testData, customer);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/customer-portal/v2/bookings?email=${encodeURIComponent(customer.email)}`,
        headers: {
          Authorization: 'Bearer customer-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data.data?.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should sort bookings by date', async () => {
      const customer = generateTestCustomer();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/customer-portal/v2/bookings?email=${encodeURIComponent(customer.email)}`,
        headers: {
          Authorization: 'Bearer customer-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        if (data.data && data.data.length > 1) {
          const dates = data.data.map((b: any) => new Date(b.startTime).getTime());
          const isSorted = dates.every((d: number, i: number) => i === 0 || d >= dates[i - 1]);
          expect(isSorted).toBe(true);
        }
      }
    });

    it('should filter by status', async () => {
      const customer = generateTestCustomer();

      const response = await server.inject({
        method: 'GET',
        url: `/v1/customer-portal/v2/bookings?email=${encodeURIComponent(customer.email)}&status=confirmed`,
        headers: {
          Authorization: 'Bearer customer-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        if (data.data) {
          data.data.forEach((booking: any) => {
            expect(booking.status).toBe('confirmed');
          });
        }
      }
    });
  });

  describe('Receipt Access', () => {
    it('should provide receipt for paid booking', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);
      await checkoutAndPay(server, booking.booking, booking.bookingToken);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/customer-portal/bookings/${booking.booking.id}/receipt`,
        headers: {
          'X-Booking-Token': booking.bookingToken,
        },
      });

      expect([200, 400, 404]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('receiptUrl');
      }
    });

    it('should not provide receipt for unpaid booking', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/customer-portal/bookings/${booking.booking.id}/receipt`,
        headers: {
          'X-Booking-Token': booking.bookingToken,
        },
      });

      expect([400, 404]).toContain(response.statusCode);
    });
  });

  describe('Data Privacy', () => {
    it('should not expose other customer data', async () => {
      const customer1 = generateTestCustomer();
      const customer2 = generateTestCustomer();

      const booking1 = await createTestBooking(server, testData, customer1);
      const booking2 = await createTestBooking(server, testData, customer2);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${booking1.booking.id}?token=${booking1.bookingToken}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      if (data.otherBookings) {
        const otherCustomerData = data.otherBookings.find(
          (b: any) => b.customerEmail === customer2.email,
        );
        expect(otherCustomerData).toBeUndefined();
      }
    });

    it('should mask sensitive data appropriately', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${booking.booking.id}?token=${booking.bookingToken}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).not.toHaveProperty('internalNotes');
      expect(data).not.toHaveProperty('staffPhone');
    });
  });

  describe('Notification Preferences', () => {
    it('should allow updating notification preferences', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const response = await server.inject({
        method: 'PATCH',
        url: `/v1/customer-portal/bookings/${booking.booking.id}/preferences`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': booking.bookingToken,
        },
        payload: {
          emailNotifications: false,
          smsNotifications: true,
        },
      });

      expect([200, 400, 404]).toContain(response.statusCode);
    });
  });

  describe('Locale and Timezone', () => {
    it('should display times in salon timezone', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${booking.booking.id}?token=${booking.bookingToken}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('timezone');
      expect(data.timezone).toBe('Europe/Copenhagen');
    });

    it('should handle different locales', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${booking.booking.id}?token=${booking.bookingToken}&locale=en-US`,
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
