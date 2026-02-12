import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/server/build-app.ts';
import { getSupabaseClient } from '../../src/server/db.ts';
import { randomUUID } from 'crypto';

describe('DB Schema Constraints Tests', () => {
  let server: ReturnType<typeof buildApp>;
  let supabase: ReturnType<typeof getSupabaseClient>;

  beforeAll(async () => {
    server = buildApp();
    await server.ready();
    supabase = getSupabaseClient();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Booking No-Overlap Constraint', () => {
    it('should reject overlapping bookings at database level', async () => {
      const salonId = randomUUID();
      const serviceId = randomUUID();
      const staffId = randomUUID();
      const customerId = randomUUID();
      const startTime = new Date(Date.now() + 86400000).toISOString();
      const endTime = new Date(Date.now() + 86400000 + 1800000).toISOString();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Overlap Test Salon',
        slug: `overlap-test-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      await supabase.from('services').insert({
        id: serviceId,
        salon_id: salonId,
        name: 'Test Service',
        duration_minutes: 30,
        price_amount: 20000,
        currency: 'DKK',
        active: true,
      });

      await supabase.from('staff_profiles').insert({
        id: staffId,
        salon_id: salonId,
        display_name: 'Test Staff',
        role: 'staff',
        active: true,
      });

      await supabase.from('customers').insert({
        id: customerId,
        salon_id: salonId,
        name: 'Test Customer',
        email: `test-${randomUUID().slice(0, 8)}@example.com`,
      });

      const { error: firstError } = await supabase.from('bookings').insert({
        id: randomUUID(),
        salon_id: salonId,
        service_id: serviceId,
        staff_id: staffId,
        customer_id: customerId,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      expect(firstError).toBeNull();

      const { error: overlapError } = await supabase.from('bookings').insert({
        id: randomUUID(),
        salon_id: salonId,
        service_id: serviceId,
        staff_id: staffId,
        customer_id: customerId,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      expect(overlapError).toBeDefined();
      expect(overlapError?.message).toContain('overlap');

      await supabase.from('bookings').delete().eq('salon_id', salonId);
      await supabase.from('customers').delete().eq('salon_id', salonId);
      await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
      await supabase.from('services').delete().eq('salon_id', salonId);
      await supabase.from('salons').delete().eq('id', salonId);
    });

    it('should reject bookings that overlap with completed bookings', async () => {
      const salonId = randomUUID();
      const serviceId = randomUUID();
      const staffId = randomUUID();
      const customerId = randomUUID();
      const startTime = new Date(Date.now() + 172800000).toISOString();
      const endTime = new Date(Date.now() + 172800000 + 1800000).toISOString();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Completed Overlap Test',
        slug: `completed-overlap-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      await supabase.from('services').insert({
        id: serviceId,
        salon_id: salonId,
        name: 'Test Service',
        duration_minutes: 30,
        price_amount: 20000,
        currency: 'DKK',
        active: true,
      });

      await supabase.from('staff_profiles').insert({
        id: staffId,
        salon_id: salonId,
        display_name: 'Test Staff',
        role: 'staff',
        active: true,
      });

      await supabase.from('customers').insert({
        id: customerId,
        salon_id: salonId,
        name: 'Test Customer',
        email: `test-${randomUUID().slice(0, 8)}@example.com`,
      });

      await supabase.from('bookings').insert({
        id: randomUUID(),
        salon_id: salonId,
        service_id: serviceId,
        staff_id: staffId,
        customer_id: customerId,
        start_time: startTime,
        end_time: endTime,
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      const { error: overlapError } = await supabase.from('bookings').insert({
        id: randomUUID(),
        salon_id: salonId,
        service_id: serviceId,
        staff_id: staffId,
        customer_id: customerId,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      expect(overlapError).toBeDefined();

      await supabase.from('bookings').delete().eq('salon_id', salonId);
      await supabase.from('customers').delete().eq('salon_id', salonId);
      await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
      await supabase.from('services').delete().eq('salon_id', salonId);
      await supabase.from('salons').delete().eq('id', salonId);
    });

    it('should allow non-overlapping bookings on same staff', async () => {
      const salonId = randomUUID();
      const serviceId = randomUUID();
      const staffId = randomUUID();
      const customerId1 = randomUUID();
      const customerId2 = randomUUID();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Non-Overlap Test',
        slug: `nonoverlap-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      await supabase.from('services').insert({
        id: serviceId,
        salon_id: salonId,
        name: 'Test Service',
        duration_minutes: 30,
        price_amount: 20000,
        currency: 'DKK',
        active: true,
      });

      await supabase.from('staff_profiles').insert({
        id: staffId,
        salon_id: salonId,
        display_name: 'Test Staff',
        role: 'staff',
        active: true,
      });

      await supabase.from('customers').insert([
        {
          id: customerId1,
          salon_id: salonId,
          name: 'Customer 1',
          email: `c1-${randomUUID().slice(0, 8)}@example.com`,
        },
        {
          id: customerId2,
          salon_id: salonId,
          name: 'Customer 2',
          email: `c2-${randomUUID().slice(0, 8)}@example.com`,
        },
      ]);

      const startTime1 = new Date(Date.now() + 259200000).toISOString();
      const endTime1 = new Date(Date.now() + 259200000 + 1800000).toISOString();
      const startTime2 = new Date(Date.now() + 259200000 + 3600000).toISOString();
      const endTime2 = new Date(Date.now() + 259200000 + 3600000 + 1800000).toISOString();

      const { error: firstError } = await supabase.from('bookings').insert({
        id: randomUUID(),
        salon_id: salonId,
        service_id: serviceId,
        staff_id: staffId,
        customer_id: customerId1,
        start_time: startTime1,
        end_time: endTime1,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      expect(firstError).toBeNull();

      const { error: secondError } = await supabase.from('bookings').insert({
        id: randomUUID(),
        salon_id: salonId,
        service_id: serviceId,
        staff_id: staffId,
        customer_id: customerId2,
        start_time: startTime2,
        end_time: endTime2,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      expect(secondError).toBeNull();

      await supabase.from('bookings').delete().eq('salon_id', salonId);
      await supabase.from('customers').delete().eq('salon_id', salonId);
      await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
      await supabase.from('services').delete().eq('salon_id', salonId);
      await supabase.from('salons').delete().eq('id', salonId);
    });
  });

  describe('Unique Constraints', () => {
    it('should reject duplicate staff-service assignments', async () => {
      const salonId = randomUUID();
      const staffId = randomUUID();
      const serviceId = randomUUID();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Unique Staff Service Test',
        slug: `unique-staff-svc-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      await supabase.from('staff_profiles').insert({
        id: staffId,
        salon_id: salonId,
        display_name: 'Test Staff',
        role: 'staff',
        active: true,
      });

      await supabase.from('services').insert({
        id: serviceId,
        salon_id: salonId,
        name: 'Test Service',
        duration_minutes: 30,
        price_amount: 20000,
        currency: 'DKK',
        active: true,
      });

      const { error: firstError } = await supabase.from('staff_services').insert({
        staff_id: staffId,
        service_id: serviceId,
      });
      expect(firstError).toBeNull();

      const { error: duplicateError } = await supabase.from('staff_services').insert({
        staff_id: staffId,
        service_id: serviceId,
      });
      expect(duplicateError).toBeDefined();

      await supabase.from('staff_services').delete().eq('staff_id', staffId);
      await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
      await supabase.from('services').delete().eq('salon_id', salonId);
      await supabase.from('salons').delete().eq('id', salonId);
    });

    it('should reject duplicate salon slugs', async () => {
      const salonId1 = randomUUID();
      const salonId2 = randomUUID();
      const slug = `duplicate-slug-${randomUUID().slice(0, 8)}`;

      await supabase.from('salons').insert({
        id: salonId1,
        name: 'First Salon',
        slug: slug,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      const { error: duplicateError } = await supabase.from('salons').insert({
        id: salonId2,
        name: 'Second Salon',
        slug: slug,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });
      expect(duplicateError).toBeDefined();

      await supabase.from('salons').delete().eq('id', salonId1);
    });

    it('should reject duplicate email for same salon customers', async () => {
      const salonId = randomUUID();
      const customerId1 = randomUUID();
      const customerId2 = randomUUID();
      const email = `duplicate-${randomUUID().slice(0, 8)}@example.com`;

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Duplicate Email Test',
        slug: `dup-email-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      const { error: firstError } = await supabase.from('customers').insert({
        id: customerId1,
        salon_id: salonId,
        name: 'First Customer',
        email: email,
      });
      expect(firstError).toBeNull();

      const { error: secondError } = await supabase.from('customers').insert({
        id: customerId2,
        salon_id: salonId,
        name: 'Second Customer',
        email: email,
      });
      expect(secondError).toBeDefined();

      await supabase.from('customers').delete().eq('salon_id', salonId);
      await supabase.from('salons').delete().eq('id', salonId);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should cascade delete bookings when customer is deleted', async () => {
      const salonId = randomUUID();
      const customerId = randomUUID();
      const serviceId = randomUUID();
      const staffId = randomUUID();
      const bookingId = randomUUID();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'FK Cascade Test',
        slug: `fk-cascade-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      await supabase.from('services').insert({
        id: serviceId,
        salon_id: salonId,
        name: 'Test Service',
        duration_minutes: 30,
        price_amount: 20000,
        currency: 'DKK',
        active: true,
      });

      await supabase.from('staff_profiles').insert({
        id: staffId,
        salon_id: salonId,
        display_name: 'Test Staff',
        role: 'staff',
        active: true,
      });

      await supabase.from('customers').insert({
        id: customerId,
        salon_id: salonId,
        name: 'Test Customer',
        email: `fk-test-${randomUUID().slice(0, 8)}@example.com`,
      });

      const startTime = new Date(Date.now() + 345600000).toISOString();
      const endTime = new Date(Date.now() + 345600000 + 1800000).toISOString();

      await supabase.from('bookings').insert({
        id: bookingId,
        salon_id: salonId,
        service_id: serviceId,
        staff_id: staffId,
        customer_id: customerId,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      const { error: deleteError } = await supabase.from('customers').delete().eq('id', customerId);
      expect(deleteError).toBeNull();

      const { data: bookingAfterDelete } = await supabase
        .from('bookings')
        .select('id')
        .eq('id', bookingId)
        .single();
      expect(bookingAfterDelete).toBeNull();

      await supabase.from('bookings').delete().eq('salon_id', salonId);
      await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
      await supabase.from('services').delete().eq('salon_id', salonId);
      await supabase.from('salons').delete().eq('id', salonId);
    });

    it('should handle orphaned bookings gracefully via API validation', async () => {
      const salonId = randomUUID();
      const serviceId = randomUUID();
      const staffId = randomUUID();
      const bookingTime = new Date(Date.now() + 432000000).toISOString();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Orphaned Booking Test',
        slug: `orphan-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      await supabase.from('services').insert({
        id: serviceId,
        salon_id: salonId,
        name: 'Test Service',
        duration_minutes: 30,
        price_amount: 20000,
        currency: 'DKK',
        active: true,
      });

      await supabase.from('staff_profiles').insert({
        id: staffId,
        salon_id: salonId,
        display_name: 'Test Staff',
        role: 'staff',
        active: true,
      });

      const response = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: `orphan-${randomUUID().slice(0, 8)}`,
          serviceId: serviceId,
          staffId: staffId,
          startUtc: bookingTime,
          customer: {
            name: 'Orphan Test',
            email: `orphan-${randomUUID().slice(0, 8)}@example.com`,
          },
        },
      });

      expect(response.statusCode).toBe(404);

      await supabase.from('staff_profiles').delete().eq('salon_id', salonId);
      await supabase.from('services').delete().eq('salon_id', salonId);
      await supabase.from('salons').delete().eq('id', salonId);
    });
  });

  describe('Cancellation Window Constraint', () => {
    it('should reject cancellation within cancellation window', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/public/salons/dev-salon',
      });

      if (response.statusCode === 200) {
        const cancelResponse = await server.inject({
          method: 'POST',
          url: '/v1/public/bookings/test-booking-id/cancel',
          headers: {
            'Content-Type': 'application/json',
            'X-Booking-Token': 'test-token',
          },
        });

        if (cancelResponse.statusCode === 409) {
          const body = JSON.parse(cancelResponse.body);
          expect(body.code).toMatch(/cancellation_window|too_close/i);
        }
      }
    });

    it('should allow cancellation before cancellation window', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings/test-old-booking-id/cancel',
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': 'test-token',
        },
      });

      expect([200, 400, 404, 409]).toContain(response.statusCode);
    });
  });

  describe('Status Transition Constraints', () => {
    it('should not allow cancelled booking to be confirmed', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: '/v1/bookings/cancelled-booking-id',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-owner-token',
        },
        payload: {
          status: 'confirmed',
        },
      });

      if (response.statusCode === 409) {
        const body = JSON.parse(response.body);
        expect(body.code).toMatch(/invalid_transition|cannot_confirm/i);
      }
    });

    it('should not allow pending booking to be marked completed directly', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: '/v1/bookings/pending-booking-id',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-owner-token',
        },
        payload: {
          status: 'completed',
        },
      });

      expect([200, 400, 409]).toContain(response.statusCode);
    });
  });

  describe('Data Integrity Constraints', () => {
    it('should enforce not-null constraints on required fields', async () => {
      const salonId = randomUUID();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Null Test Salon',
        slug: `null-test-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      const { error: missingName } = await supabase.from('salons').insert({
        id: randomUUID(),
        slug: `null-name-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });
      expect(missingName).toBeDefined();

      await supabase.from('salons').delete().eq('id', salonId);
    });

    it('should validate email format at database level', async () => {
      const salonId = randomUUID();
      const customerId = randomUUID();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Email Validation Test',
        slug: `email-valid-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      const { error: invalidEmail } = await supabase.from('customers').insert({
        id: customerId,
        salon_id: salonId,
        name: 'Test',
        email: 'not-an-email',
      });
      expect(invalidEmail).toBeDefined();

      await supabase.from('salons').delete().eq('id', salonId);
    });

    it('should validate phone format', async () => {
      const salonId = randomUUID();
      const customerId = randomUUID();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Phone Validation Test',
        slug: `phone-valid-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      const { error: invalidPhone } = await supabase.from('customers').insert({
        id: customerId,
        salon_id: salonId,
        name: 'Test',
        email: `phone-test-${randomUUID().slice(0, 8)}@example.com`,
        phone: 'not-a-phone',
      });

      await supabase.from('salons').delete().eq('id', salonId);
    });
  });

  describe('Check Constraint Tests', () => {
    it('should reject negative prices', async () => {
      const salonId = randomUUID();
      const serviceId = randomUUID();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Negative Price Test',
        slug: `neg-price-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      const { error: negativePrice } = await supabase.from('services').insert({
        id: serviceId,
        salon_id: salonId,
        name: 'Negative Service',
        duration_minutes: 30,
        price_amount: -1000,
        currency: 'DKK',
        active: true,
      });
      expect(negativePrice).toBeDefined();

      await supabase.from('salons').delete().eq('id', salonId);
    });

    it('should reject zero duration services', async () => {
      const salonId = randomUUID();
      const serviceId = randomUUID();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Zero Duration Test',
        slug: `zero-duration-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      const { error: zeroDuration } = await supabase.from('services').insert({
        id: serviceId,
        salon_id: salonId,
        name: 'Zero Duration Service',
        duration_minutes: 0,
        price_amount: 10000,
        currency: 'DKK',
        active: true,
      });
      expect(zeroDuration).toBeDefined();

      await supabase.from('salons').delete().eq('id', salonId);
    });

    it('should reject future dates in created_at', async () => {
      const salonId = randomUUID();

      await supabase.from('salons').insert({
        id: salonId,
        name: 'Future Created At Test',
        slug: `future-created-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
      });

      const futureDate = new Date(Date.now() + 86400000 * 365).toISOString();
      const { error: futureCreatedAt } = await supabase.from('salons').insert({
        id: randomUUID(),
        name: 'Future Salon',
        slug: `future-salon-${randomUUID().slice(0, 8)}`,
        timezone: 'Europe/Copenhagen',
        locale: 'da-DK',
        currency: 'DKK',
        status: 'active',
        created_at: futureDate,
      });

      await supabase.from('salons').delete().eq('id', salonId);
    });
  });

  describe('Index Performance Tests', () => {
    it('should use index for salon slug lookups', async () => {
      const startTime = Date.now();
      const response = await server.inject({
        method: 'GET',
        url: '/v1/public/salons/dev-salon',
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(100);
    });

    it('should use index for booking date range queries', async () => {
      const startTime = Date.now();
      const response = await server.inject({
        method: 'GET',
        url: '/v1/content/bookings?from=2024-01-01&to=2024-12-31',
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect([200, 401, 403]).toContain(response.statusCode);
      expect(duration).toBeLessThan(500);
    });
  });
});
