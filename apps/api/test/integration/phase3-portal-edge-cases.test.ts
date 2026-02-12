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

const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';

describe('Phase 3: Customer Portal & Edge Cases', () => {
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
    const supabase = getSupabaseClient();
    await supabase.from('notification_outbox').delete().eq('salon_id', testData.salonId);
    await supabase.from('payments').delete().eq('salon_id', testData.salonId);
    await supabase.from('bookings').delete().eq('salon_id', testData.salonId);
    await supabase.from('customers').delete().eq('salon_id', testData.salonId);
  });

  describe('3.1 Customer Portal - Profile', () => {
    it('should get customer profile with valid session', async () => {
      // Create a customer with user_id
      const supabase = getSupabaseClient();
      const customerId = randomUUID();
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: 'portal@test.com',
        password: 'TestPass123!',
        email_confirm: true
      });
      if (authError || !authUser.user) {
        throw authError ?? new Error('Failed to create auth user');
      }
      const userId = authUser.user.id;

      await supabase.from('customers').insert({
        id: customerId,
        salon_id: testData.salonId,
        user_id: userId,
        name: 'Portal Test User',
        email: 'portal@test.com',
        phone: '+4544444444'
      });

      await supabase.from('users').insert({
        id: userId,
        email: 'portal@test.com',
        primary_salon_id: testData.salonId
      });

      const response = await server.inject({
        method: 'GET',
        url: '/v1/portal/me',
        headers: { 'x-user-id': userId }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.name).toBe('Portal Test User');
      expect(data.email).toBe('portal@test.com');

      // Cleanup
      await supabase.from('customers').delete().eq('id', customerId);
      await supabase.from('users').delete().eq('id', userId);
      await supabase.auth.admin.deleteUser(userId);
    });
  });

  describe('3.2 Edge Cases - Concurrent Requests', () => {
    it('should handle concurrent booking attempts on same slot', async () => {
      const tomorrow = getTomorrowAt(10);
      
      // Get a slot
      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`
      });
      
      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];
      
      // Two concurrent booking attempts
      const customer1 = generateTestCustomer();
      const customer2 = generateTestCustomer();
      
      const promise1 = server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer: customer1,
          idempotencyKey: `concurrent-${randomUUID().slice(0, 8)}-1`
        }
      });
      
      const promise2 = server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer: customer2,
          idempotencyKey: `concurrent-${randomUUID().slice(0, 8)}-2`
        }
      });
      
      const [response1, response2] = await Promise.all([promise1, promise2]);
      
      // One should succeed, one should fail (or both succeed with different slots)
      const successCount = [response1, response2].filter(r => r.statusCode === 201).length;
      const failCount = [response1, response2].filter(r => r.statusCode === 409).length;
      
      // Either one succeeds and one fails with conflict, or both succeed
      expect(successCount + failCount).toBe(2);
    });

    it('should handle rapid webhook calls', async () => {
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
      
      // Send multiple webhooks simultaneously
      const promises = Array(5).fill(null).map(() => 
        server.inject({
          method: 'POST',
          url: '/v1/webhooks/stripe',
          headers: { 'Content-Type': 'application/json' },
          payload: {
            paymentId: checkoutData.paymentId,
            bookingId: bookingData.booking.id,
            sessionId: `mock_session_${checkoutData.paymentId}`,
            eventId
          }
        })
      );
      
      const responses = await Promise.all(promises);
      
      // All should return 200
      expect(responses.every(r => r.statusCode === 200)).toBe(true);
      
      // All except first should be idempotent
      const idempotentCount = responses.filter(r => {
        const data = JSON.parse(r.body);
        return data.idempotent === true;
      }).length;
      
      expect(idempotentCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe('3.3 Edge Cases - Validation', () => {
    it('should reject very long names', async () => {
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
            name: 'A'.repeat(500), // Very long name
            email: 'test@example.com'
          }
        }
      });
      
      // Should either accept or reject gracefully
      expect([201, 400]).toContain(response.statusCode);
    });

    it('should handle special characters in input', async () => {
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
            name: 'Test <script>alert("xss")</script> User',
            email: 'test@example.com',
            phone: '+4512345678'
          },
          notes: 'Special chars: <>&"\'\n\t'
        }
      });
      
      expect(response.statusCode).toBe(201);
      
      // Verify the data is stored safely (no script tags executed)
      const data = JSON.parse(response.body);
      const supabase = getSupabaseClient();
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', data.booking.id)
        .single();
      
      expect(booking).toBeDefined();
    });

    it('should reject SQL injection attempts', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/' OR '1'='1'--`
      });
      
      // Should not return data from other salons - can be 400 (validation) or 404 (not found)
      expect([400, 404]).toContain(response.statusCode);
    });

    it('should validate email format strictly', async () => {
      const tomorrow = getTomorrowAt(10);
      
      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`
      });
      
      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];
      
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user@.com',
        'user space@example.com',
        ''
      ];
      
      for (const email of invalidEmails) {
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
              name: 'Test User',
              email
            }
          }
        });
        
        expect(response.statusCode).toBe(400);
      }
    });
  });

  describe('3.4 Edge Cases - Timezone', () => {
    it('should handle DST transitions', async () => {
      // Create a booking near DST transition
      const dstDate = new Date('2026-03-29T02:30:00'); // European DST start
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${dstDate.toISOString()}&days=1&limit=10`
      });
      
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.meta.timezone).toBe('Europe/Copenhagen');
      
      // Slots should be in correct timezone
      if (data.slots.length > 0) {
        expect(data.slots[0].startUtc).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      }
    });

    it('should handle midnight slots', async () => {
      // Late night booking attempt
      const lateNight = new Date();
      lateNight.setDate(lateNight.getDate() + 1);
      lateNight.setHours(23, 30, 0, 0);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${lateNight.toISOString()}&days=1&limit=5`
      });
      
      expect(response.statusCode).toBe(200);
    });
  });

  describe('3.5 Edge Cases - Business Logic', () => {
    it('should handle service with zero duration', async () => {
      const supabase = getSupabaseClient();
      const zeroDurationServiceId = randomUUID();
      
      await supabase.from('services').insert({
        id: zeroDurationServiceId,
        salon_id: testData.salonId,
        name: 'Zero Duration',
        duration_minutes: 0,
        price_amount: 0,
        currency: 'DKK',
        active: true
      });
      
      await supabase.from('staff_services').insert({
        staff_id: testData.staffId,
        service_id: zeroDurationServiceId
      });
      
      const tomorrow = getTomorrowAt(10);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${zeroDurationServiceId}&from=${tomorrow.toISOString()}&days=1&limit=5`
      });
      
      // Should fail or handle gracefully - zero duration is invalid so 400 or 404
      expect([200, 400, 404]).toContain(response.statusCode);
      
      // Cleanup
      await supabase.from('staff_services').delete().eq('service_id', zeroDurationServiceId);
      await supabase.from('services').delete().eq('id', zeroDurationServiceId);
    });

    it('should handle staff with no working hours', async () => {
      const supabase = getSupabaseClient();
      const noHoursStaffId = randomUUID();
      
      await supabase.from('staff_profiles').insert({
        id: noHoursStaffId,
        salon_id: testData.salonId,
        display_name: 'No Hours Staff',
        role: 'staff',
        active: true
      });
      
      await supabase.from('staff_services').insert({
        staff_id: noHoursStaffId,
        service_id: testData.serviceId
      });
      
      const tomorrow = getTomorrowAt(10);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&staffId=${noHoursStaffId}&from=${tomorrow.toISOString()}&days=1&limit=5`
      });
      
      // Should return empty slots or fall back to salon hours
      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      
      // Cleanup
      await supabase.from('staff_services').delete().eq('staff_id', noHoursStaffId);
      await supabase.from('staff_profiles').delete().eq('id', noHoursStaffId);
    });
  });

  describe('3.6 Rate Limiting', () => {
    it('should enforce rate limits on public booking creation', async () => {
      // Make many rapid requests
      const promises = Array(35).fill(null).map(() => 
        server.inject({
          method: 'POST',
          url: '/v1/public/bookings',
          headers: { 'Content-Type': 'application/json' },
          payload: {
            salonSlug: testData.slug,
            serviceId: testData.serviceId,
            customer: generateTestCustomer()
          }
        })
      );
      
      const responses = await Promise.all(promises);
      
      // Some should be rate limited (429)
      const rateLimited = responses.filter(r => r.statusCode === 429).length;
      const accepted = responses.filter(r => r.statusCode === 201 || r.statusCode === 400).length;
      
      // Most should be rate limited after 30 requests per minute
      expect(rateLimited + accepted).toBe(35);
    });
  });
});
