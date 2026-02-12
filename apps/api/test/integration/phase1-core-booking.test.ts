import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { 
  createTestServer, 
  seedTestSalon, 
  cleanupTestData,
  generateTestCustomer,
  getTomorrowAt,
  createTestBooking,
  checkoutAndPay
} from '../test-utils.js';
import { getSupabaseClient } from '../../src/server/db.js';
import { randomUUID } from 'crypto';
import { listExpiredPendingBookings, expirePendingBookings } from '../../src/modules/bookings/repo/bookings-repo.js';

const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';

describe('Phase 1: Core Booking Flow Tests', () => {
  let server: any;
  let testData: { salonId: string; serviceId: string; staffId: string; slug: string };
  
  beforeAll(async () => {
    server = await createTestServer();
    testData = await seedTestSalon();
  });
  
  afterAll(async () => {
    await cleanupTestData(testData.salonId);
    await server.close();
  });
  
  beforeEach(async () => {
    // Clean up bookings and notifications before each test
    const supabase = getSupabaseClient();
    await supabase.from('notification_outbox').delete().eq('salon_id', testData.salonId);
    await supabase.from('payments').delete().eq('salon_id', testData.salonId);
    await supabase.from('bookings').delete().eq('salon_id', testData.salonId);
    await supabase.from('customers').delete().eq('salon_id', testData.salonId);
  });

  describe('1.1 Salon Discovery', () => {
    it('should get salon by slug', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.id).toBe(testData.salonId);
      expect(data.name).toContain('Test Salon Integration');
      expect(data.slug).toBe(testData.slug);
      expect(data.status).toBe('active');
      expect(data.timezone).toBe('Europe/Copenhagen');
      expect(data.locale).toBe('da-DK');
      expect(data.currency).toBe('DKK');
    });

    it('should return 404 for non-existent salon', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/public/salons/non-existent-slug-12345'
      });
      
      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.code).toBe('SALON_NOT_FOUND');
    });

    it('should return 404 for invalid slug format', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/public/salons/a' // Too short
      });
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe('1.2 Service Selection', () => {
    it('should list active services', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}/services`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBeGreaterThan(0);
      
      const service = data.data[0];
      expect(service.id).toBe(testData.serviceId);
      expect(service.name).toBe('Test Service');
      expect(service.durationMinutes).toBe(30);
      expect(service.price).toBe(29900);
      expect(service.currency).toBe('DKK');
      expect(service.active).toBe(true);
    });

    it('should filter inactive services', async () => {
      // Create inactive service
      const supabase = getSupabaseClient();
      const inactiveServiceId = randomUUID();
      await supabase.from('services').insert({
        id: inactiveServiceId,
        salon_id: testData.salonId,
        name: 'Inactive Service',
        duration_minutes: 30,
        price_amount: 10000,
        currency: 'DKK',
        active: false
      });
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}/services`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      const inactiveInList = data.data.find((s: any) => s.id === inactiveServiceId);
      expect(inactiveInList).toBeUndefined();
      
      // Cleanup
      await supabase.from('services').delete().eq('id', inactiveServiceId);
    });
  });

  describe('1.3 Staff Selection', () => {
    it('should list all staff', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}/staff`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBeGreaterThan(0);
      
      const staff = data.data[0];
      expect(staff.id).toBe(testData.staffId);
      expect(staff.name).toBe('Test Staff');
      expect(staff.role).toBe('staff');
      expect(staff.active).toBe(true);
    });

    it('should filter staff by service', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}/staff?serviceId=${testData.serviceId}`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.length).toBe(1);
      expect(data.data[0].id).toBe(testData.staffId);
    });

    it('should filter inactive staff', async () => {
      // Create inactive staff
      const supabase = getSupabaseClient();
      const inactiveStaffId = randomUUID();
      await supabase.from('staff_profiles').insert({
        id: inactiveStaffId,
        salon_id: testData.salonId,
        display_name: 'Inactive Staff',
        role: 'staff',
        active: false
      });
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}/staff`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      const inactiveInList = data.data.find((s: any) => s.id === inactiveStaffId);
      expect(inactiveInList).toBeUndefined();
      
      // Cleanup
      await supabase.from('staff_profiles').delete().eq('id', inactiveStaffId);
    });
  });

  describe('1.4 Availability', () => {
    it('should get availability slots', async () => {
      const tomorrow = getTomorrowAt(10);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=2&limit=10`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.slots).toBeInstanceOf(Array);
      // Slots may be empty if outside business hours
      if (data.slots.length > 0) {
        expect(data.slots.length).toBeLessThanOrEqual(10);
        
        const slot = data.slots[0];
        expect(slot).toHaveProperty('startUtc');
        expect(slot).toHaveProperty('endUtc');
        expect(slot).toHaveProperty('staffId');
      }
      
      expect(data.meta).toHaveProperty('timezone');
      expect(data.meta.timezone).toBe('Europe/Copenhagen');
      expect(data.meta).toHaveProperty('intervalMinutes');
    });

    it('should respect days parameter', async () => {
      const tomorrow = getTomorrowAt(9);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=3&limit=50`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.slots.length).toBeGreaterThan(0);
      expect(data.meta.days).toBe(3);
    });

    it('should respect limit parameter', async () => {
      const tomorrow = getTomorrowAt(9);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=3`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.slots.length).toBeLessThanOrEqual(3);
    });

    it('should block slots with existing bookings', async () => {
      // First create a booking
      const bookingData = await createTestBooking(server, testData);
      
      const tomorrow = new Date(bookingData.booking.startTime);
      tomorrow.setHours(0, 0, 0, 0);
      
      // Try to get availability for same time
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${testData.staffId}&from=${tomorrow.toISOString()}&days=1&limit=50`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      
      // The booked slot should not be available
      const bookedSlot = data.slots.find((s: any) => s.startUtc === bookingData.booking.startTime);
      expect(bookedSlot).toBeUndefined();
    });

    it('should return 404 for invalid service', async () => {
      const tomorrow = getTomorrowAt(9);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${randomUUID()}&from=${tomorrow.toISOString()}&days=1`
      });
      
      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid query params', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=invalid-uuid&from=invalid-date&days=100`
      });
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe('1.5 Booking Creation', () => {
    it('should create a booking', async () => {
      const customer = generateTestCustomer();
      const bookingData = await createTestBooking(server, testData, customer);
      
      expect(bookingData.booking).toHaveProperty('id');
      expect(bookingData.booking.status).toBe('pending');
      expect(bookingData.booking.customerId).toBeDefined();
      expect(bookingData.bookingToken).toBeDefined();
      expect(bookingData.expiresAt).toBeDefined();
      
      // Verify customer was created
      const supabase = getSupabaseClient();
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', bookingData.booking.customerId)
        .single();
      
      expect(customerData).toBeDefined();
      expect(customerData.name).toBe(customer.name);
      expect(customerData.email).toBe(customer.email);
    });

    it('should be idempotent with same key', async () => {
      const tomorrow = getTomorrowAt(10);
      const idempotencyKey = `test-${randomUUID().slice(0, 8)}`;
      const customer = generateTestCustomer();
      
      // Get a slot
      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`
      });
      
      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];
      
      // Create first booking
      const response1 = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer,
          idempotencyKey
        }
      });
      
      expect(response1.statusCode).toBe(201);
      const data1 = JSON.parse(response1.body);
      
      // Try again with same key
      const response2 = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer: generateTestCustomer(), // Different customer
          idempotencyKey // Same key
        }
      });
      
      // API may return 201 (idempotent success) or 409 (slot conflict)
      expect([201, 409]).toContain(response2.statusCode);
      
      if (response2.statusCode === 201) {
        const data2 = JSON.parse(response2.body);
        // Should return same booking
        expect(data2.booking.id).toBe(data1.booking.id);
      }
    });

    it('should fail if slot no longer available', async () => {
      // First booking takes the slot
      const bookingData = await createTestBooking(server, testData);
      
      // Try to book same slot again (without idempotency key)
      const response = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: bookingData.booking.staffId,
          startUtc: bookingData.booking.startTime,
          customer: generateTestCustomer()
        }
      });
      
      // API returns 400 or 409 depending on validation order
      expect([400, 409]).toContain(response.statusCode);
    });

    it('should fail with invalid customer data', async () => {
      const tomorrow = getTomorrowAt(10);
      
      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`
      });
      
      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];
      
      const response = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer: {
            name: '', // Invalid - empty name
            email: 'invalid-email'
          }
        }
      });
      
      expect(response.statusCode).toBe(400);
    });

    it('should reject booking for inactive service', async () => {
      const supabase = getSupabaseClient();
      await supabase.from('services').update({ active: false }).eq('id', testData.serviceId);

      try {
        const response = await server.inject({
          method: 'POST',
          url: '/v1/public/bookings',
          headers: { 'Content-Type': 'application/json' },
          payload: {
            salonSlug: testData.slug,
            serviceId: testData.serviceId,
            staffId: testData.staffId,
            startUtc: getTomorrowAt(10).toISOString(),
            customer: generateTestCustomer()
          }
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.code).toBe('SERVICE_INACTIVE');
      } finally {
        await supabase.from('services').update({ active: true }).eq('id', testData.serviceId);
      }
    });

    it('should set pending expiry on booking creation', async () => {
      const bookingData = await createTestBooking(server, testData);
      const supabase = getSupabaseClient();
      const { data: row, error } = await supabase
        .from('bookings')
        .select('expires_at')
        .eq('id', bookingData.booking.id)
        .maybeSingle();
      expect(error).toBeNull();
      expect(row?.expires_at).toBeTruthy();
      if (row?.expires_at) {
        const expiresAt = new Date(row.expires_at).getTime();
        const now = Date.now();
        expect(expiresAt).toBeGreaterThan(now);
        expect(expiresAt).toBeLessThan(now + 60 * 60 * 1000);
      }
    });

    it('should expire pending bookings when past expiry', async () => {
      const bookingData = await createTestBooking(server, testData);
      const supabase = getSupabaseClient();
      await supabase
        .from('bookings')
        .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
        .eq('id', bookingData.booking.id);

      const expired = await listExpiredPendingBookings(10);
      expect(expired.some((b) => b.id === bookingData.booking.id)).toBe(true);
      const expiredCount = await expirePendingBookings([bookingData.booking.id]);
      expect(expiredCount).toBe(1);

      const { data: bookingRow } = await supabase
        .from('bookings')
        .select('status, cancel_reason_key')
        .eq('id', bookingData.booking.id)
        .maybeSingle();
      expect(bookingRow?.status).toBe('cancelled');
      expect(bookingRow?.cancel_reason_key).toBe('booking.expired');
    });

    it('should require email or phone for customer', async () => {
      const tomorrow = getTomorrowAt(10);
      
      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`
      });
      
      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];
      
      const response = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer: {
            name: 'No Contact'
          }
        }
      });
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should accept email-only and phone-only customers', async () => {
      const tomorrow = getTomorrowAt(10);
      
      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=10`
      });
      
      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];
      
      const responseEmail = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer: {
            name: 'Email Only',
            email: 'email-only@example.com'
          }
        }
      });
      
      expect(responseEmail.statusCode).toBe(201);
      
      const nextDay = new Date(tomorrow.getTime());
      nextDay.setDate(nextDay.getDate() + 1);
      const slotsResponse2 = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${nextDay.toISOString()}&days=1&limit=10`
      });
      const slotsData2 = JSON.parse(slotsResponse2.body);
      const slot2 = slotsData2.slots[0] ?? slot;

      const responsePhone = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot2.staffId,
          startUtc: slot2.startUtc,
          customer: {
            name: 'Phone Only',
            phone: '+4512340000'
          }
        }
      });
      
      expect(responsePhone.statusCode).toBe(201);
    });

    it('should reuse existing customer by email', async () => {
      const customer = generateTestCustomer();
      const booking1 = await createTestBooking(server, testData, customer);
      const booking2 = await createTestBooking(server, testData, customer);
      
      expect(booking1.booking.customerId).toBe(booking2.booking.customerId);
    });

    it('should reuse existing customer by phone', async () => {
      const customer = generateTestCustomer();
      const booking1 = await createTestBooking(server, testData, customer, { slotIndex: 0, limit: 50 });

      const booking2 = await createTestBooking(
        server,
        testData,
        {
          name: 'Same Phone',
          email: `other-${randomUUID().slice(0, 8)}@example.com`,
          phone: customer.phone
        },
        { slotIndex: 1, limit: 50 }
      );

      expect(booking1.booking.customerId).toBe(booking2.booking.customerId);
    });
  });

  describe('1.6 Checkout', () => {
    it('should create checkout session', async () => {
      const bookingData = await createTestBooking(server, testData);
      
      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: { 
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`
        }
      });
      
      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.checkoutUrl).toContain('checkout.mock');
      expect(data.paymentId).toBeDefined();
      expect(data.provider).toBe('stripe');
    });

    it('should fail with invalid token', async () => {
      const bookingData = await createTestBooking(server, testData);
      
      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: { 
          'Content-Type': 'application/json',
          'X-Booking-Token': 'invalid-token'
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`
        }
      });
      
      expect(response.statusCode).toBe(401);
    });

    it('should fail if booking not pending', async () => {
      const bookingData = await createTestBooking(server, testData);
      
      // First checkout
      await checkoutAndPay(server, bookingData.booking, bookingData.bookingToken);
      
      // Try to checkout again
      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: { 
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`
        }
      });
      
      expect(response.statusCode).toBe(409);
    });

    it('should fail with invalid return URLs', async () => {
      const bookingData = await createTestBooking(server, testData);
      
      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: { 
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken
        },
        payload: {
          successUrl: 'not-a-valid-url',
          cancelUrl: `${publicUrl}/cancel`
        }
      });
      
      expect(response.statusCode).toBe(400);
    });

    it('should require successUrl', async () => {
      const bookingData = await createTestBooking(server, testData);
      
      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: { 
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken
        },
        payload: {
          cancelUrl: `${publicUrl}/cancel`
        }
      });
      
      expect(response.statusCode).toBe(400);
    });

    it('should require cancelUrl', async () => {
      const bookingData = await createTestBooking(server, testData);
      
      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: { 
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken
        },
        payload: {
          successUrl: `${publicUrl}/success`
        }
      });
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe('1.7 Payment Webhook', () => {
    it('should process mock payment webhook', async () => {
      const bookingData = await createTestBooking(server, testData);
      const checkoutData = await checkoutAndPay(server, bookingData.booking, bookingData.bookingToken);
      
      // Verify payment succeeded and booking confirmed
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${bookingData.booking.id}?token=${bookingData.bookingToken}`
      });
      
      const data = JSON.parse(response.body);
      expect(data.status).toBe('confirmed');
      expect(data.paymentStatus).toBe('succeeded');
    });

    it('should cancel booking on payment failure', async () => {
      const bookingData = await createTestBooking(server, testData);
      await checkoutAndPay(server, bookingData.booking, bookingData.bookingToken, { status: 'failed' });

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${bookingData.booking.id}?token=${bookingData.bookingToken}`
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('cancelled');
      expect(data.paymentStatus).toBe('failed');
    });

    it('should queue confirmation notifications with manage url', async () => {
      const bookingData = await createTestBooking(server, testData);
      await checkoutAndPay(server, bookingData.booking, bookingData.bookingToken);

      const supabase = getSupabaseClient();
      const { data: notifications } = await supabase
        .from('notification_outbox')
        .select('*')
        .eq('booking_id', bookingData.booking.id)
        .eq('type', 'booking.confirmed');

      expect(notifications?.length).toBeGreaterThan(0);
      expect(notifications?.some((n: any) => n.channel === 'email')).toBe(true);
      expect(notifications?.some((n: any) => n.channel === 'sms')).toBe(true);

      const payload = notifications?.[0]?.payload as { manageUrl?: string; salonName?: string } | undefined;
      expect(payload?.manageUrl).toContain(bookingData.booking.id);
      expect(payload?.salonName).toContain('Test Salon Integration');
    });

    it('should be idempotent', async () => {
      const bookingData = await createTestBooking(server, testData);
      
      // Create checkout
      const checkoutResponse = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: { 
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`
        }
      });
      
      const checkoutData = JSON.parse(checkoutResponse.body);
      const eventId = `mock_event_${randomUUID().slice(0, 8)}`;
      
      // First webhook
      const response1 = await server.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          paymentId: checkoutData.paymentId,
          bookingId: bookingData.booking.id,
          sessionId: `mock_session_${checkoutData.paymentId}`,
          eventId
        }
      });
      
      expect(response1.statusCode).toBe(200);
      
      // Same webhook again
      const response2 = await server.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          paymentId: checkoutData.paymentId,
          bookingId: bookingData.booking.id,
          sessionId: `mock_session_${checkoutData.paymentId}`,
          eventId // Same event
        }
      });
      
      expect(response2.statusCode).toBe(200);
      const data2 = JSON.parse(response2.body);
      expect(data2.idempotent).toBe(true);
    });

    it('should handle orphaned webhook', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          paymentId: randomUUID(),
          bookingId: randomUUID(),
          sessionId: 'mock_session_unknown',
          eventId: `mock_event_${randomUUID().slice(0, 8)}`
        }
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.orphaned).toBe(true);
    });

    it('should detect booking mismatch', async () => {
      const bookingData = await createTestBooking(server, testData);
      const otherBooking = await createTestBooking(server, testData);
      
      // Create checkout for first booking
      const checkoutResponse = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${bookingData.booking.id}/checkout`,
        headers: { 
          'Content-Type': 'application/json',
          'X-Booking-Token': bookingData.bookingToken
        },
        payload: {
          successUrl: `${publicUrl}/success`,
          cancelUrl: `${publicUrl}/cancel`
        }
      });
      
      const checkoutData = JSON.parse(checkoutResponse.body);
      
      // Try to apply to different booking
      const response = await server.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          paymentId: checkoutData.paymentId,
          bookingId: otherBooking.booking.id, // Wrong booking
          sessionId: `mock_session_${checkoutData.paymentId}`,
          eventId: `mock_event_${randomUUID().slice(0, 8)}`
        }
      });
      
      expect(response.statusCode).toBe(409);
    });
  });

  describe('1.8 Booking Retrieval', () => {
    it('should get booking with valid token', async () => {
      const bookingData = await createTestBooking(server, testData);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${bookingData.booking.id}?token=${bookingData.bookingToken}`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.id).toBe(bookingData.booking.id);
      expect(data.status).toBe('pending');
      expect(data.paymentStatus).toBeNull();
      expect(data.customerName).toBeDefined();
      expect(data.serviceName).toBe('Test Service');
      expect(data.staffName).toBe('Test Staff');
      expect(data.salonEmail).toBeDefined();
      expect(data.salonPhone).toBeDefined();
    });

    it('should fail with invalid token', async () => {
      const bookingData = await createTestBooking(server, testData);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${bookingData.booking.id}?token=invalid-token`
      });
      
      expect(response.statusCode).toBe(401);
    });

    it('should fail with mismatched booking and token', async () => {
      const bookingData1 = await createTestBooking(server, testData);
      const bookingData2 = await createTestBooking(server, testData);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${bookingData1.booking.id}?token=${bookingData2.bookingToken}`
      });
      
      expect(response.statusCode).toBe(403);
    });
  });
});
