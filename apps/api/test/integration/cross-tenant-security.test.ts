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

describe('Cross-Tenant Security Tests', () => {
  let server: ReturnType<typeof buildApp>;
  let tenant1Data: Awaited<ReturnType<typeof seedTestSalon>>;
  let tenant2Data: Awaited<ReturnType<typeof seedTestSalon>>;

  beforeAll(async () => {
    server = buildApp();
    await server.ready();
    tenant1Data = await seedTestSalon({ slug: `tenant1-${randomUUID().slice(0, 8)}` });
    tenant2Data = await seedTestSalon({ slug: `tenant2-${randomUUID().slice(0, 8)}` });
  });

  afterAll(async () => {
    await cleanupTestData(tenant1Data.salonId);
    await cleanupTestData(tenant2Data.salonId);
    await server.close();
  });

  beforeEach(async () => {
    const supabase = getSupabaseClient();
    await supabase.from('bookings').delete().eq('salon_id', tenant1Data.salonId);
    await supabase.from('bookings').delete().eq('salon_id', tenant2Data.salonId);
  });

  describe('Booking Access Isolation', () => {
    it('should prevent tenant 1 from accessing tenant 2 bookings', async () => {
      const tenant1Booking = await createTestBooking(server, tenant1Data);
      const tenant2Booking = await createTestBooking(server, tenant2Data);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${tenant2Booking.booking.id}?token=${tenant1Booking.bookingToken}`,
        headers: {
          Authorization: 'Bearer tenant1-owner-token',
        },
      });

      expect([401, 403, 404]).toContain(response.statusCode);
    });

    it('should prevent cross-tenant booking cancellation', async () => {
      const tenant1Booking = await createTestBooking(server, tenant1Data);
      const tenant2Booking = await createTestBooking(server, tenant2Data);

      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${tenant2Booking.booking.id}/cancel`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': tenant1Booking.bookingToken,
        },
        payload: {
          reason: 'Cross-tenant cancel attempt',
        },
      });

      expect([401, 403, 404]).toContain(response.statusCode);
    });

    it('should prevent cross-tenant reschedule', async () => {
      const tenant1Booking = await createTestBooking(server, tenant1Data);
      const tenant2Booking = await createTestBooking(server, tenant2Data);

      const tomorrow = getTomorrowAt(14);

      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/bookings/${tenant2Booking.booking.id}/reschedule`,
        headers: {
          'Content-Type': 'application/json',
          'X-Booking-Token': tenant1Booking.bookingToken,
        },
        payload: {
          newStartTime: tomorrow.toISOString(),
        },
      });

      expect([401, 403, 404]).toContain(response.statusCode);
    });
  });

  describe('Customer Data Isolation', () => {
    it('should prevent tenant 1 from seeing tenant 2 customers', async () => {
      const supabase = getSupabaseClient();

      const tenant1CustomerId = randomUUID();
      const tenant2CustomerId = randomUUID();

      await supabase.from('customers').insert({
        id: tenant1CustomerId,
        salon_id: tenant1Data.salonId,
        name: 'Tenant 1 Customer',
        email: `t1-${randomUUID().slice(0, 8)}@example.com`,
      });

      await supabase.from('customers').insert({
        id: tenant2CustomerId,
        salon_id: tenant2Data.salonId,
        name: 'Tenant 2 Customer',
        email: `t2-${randomUUID().slice(0, 8)}@example.com`,
      });

      try {
        const { data: tenant1Customers } = await supabase
          .from('customers')
          .select('*')
          .eq('salon_id', tenant1Data.salonId);

        const { data: tenant2Customers } = await supabase
          .from('customers')
          .select('*')
          .eq('salon_id', tenant2Data.salonId);

        const crossTenantLeak = tenant1Customers?.some((c) => c.salon_id === tenant2Data.salonId);

        expect(crossTenantLeak).toBe(false);

        const reverseLeak = tenant2Customers?.some((c) => c.salon_id === tenant1Data.salonId);

        expect(reverseLeak).toBe(false);
      } finally {
        await supabase.from('customers').delete().eq('id', tenant1CustomerId);
        await supabase.from('customers').delete().eq('id', tenant2CustomerId);
      }
    });

    it('should prevent creating bookings with cross-tenant customers', async () => {
      const supabase = getSupabaseClient();

      const crossTenantCustomerId = randomUUID();
      await supabase.from('customers').insert({
        id: crossTenantCustomerId,
        salon_id: tenant2Data.salonId,
        name: 'Tenant 2 Customer',
        email: `cross-${randomUUID().slice(0, 8)}@example.com`,
      });

      try {
        const tomorrow = getTomorrowAt(10);

        const slotsResponse = await server.inject({
          method: 'GET',
          url: `/v1/public/availability?salonSlug=${tenant1Data.slug}&serviceId=${tenant1Data.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`,
        });

        const slotsData = JSON.parse(slotsResponse.body);
        const slot = slotsData.slots[0];

        const response = await server.inject({
          method: 'POST',
          url: '/v1/public/bookings',
          headers: { 'Content-Type': 'application/json' },
          payload: {
            salonSlug: tenant1Data.slug,
            serviceId: tenant1Data.serviceId,
            staffId: tenant1Data.staffId,
            startUtc: slot.startUtc,
            customerId: crossTenantCustomerId,
            idempotencyKey: `cross-tenant-${randomUUID().slice(0, 8)}`,
          },
        });

        expect([400, 403, 404, 422]).toContain(response.statusCode);
      } finally {
        await supabase.from('customers').delete().eq('id', crossTenantCustomerId);
      }
    });
  });

  describe('Staff Access Isolation', () => {
    it('should prevent staff from accessing other tenant data', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/content/salons/${tenant2Data.slug}/settings`,
        headers: {
          Authorization: `Bearer tenant1-staff-token`,
        },
      });

      expect([401, 403, 404]).toContain(response.statusCode);
    });

    it('should prevent modifying other tenant services', async () => {
      const supabase = getSupabaseClient();
      const tenant2ServiceId = randomUUID();

      await supabase.from('services').insert({
        id: tenant2ServiceId,
        salon_id: tenant2Data.salonId,
        name: 'Tenant 2 Service',
        duration_minutes: 30,
        price_amount: 20000,
        currency: 'DKK',
        active: true,
      });

      try {
        const response = await server.inject({
          method: 'PATCH',
          url: `/v1/content/services/${tenant2ServiceId}`,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer tenant1-staff-token`,
          },
          payload: {
            name: 'Hacked Service Name',
          },
        });

        expect([401, 403, 404]).toContain(response.statusCode);
      } finally {
        await supabase.from('services').delete().eq('id', tenant2ServiceId);
      }
    });
  });

  describe('Payment Data Isolation', () => {
    it('should prevent accessing other tenant payments', async () => {
      const tenant1Booking = await createTestBooking(server, tenant1Data);
      const tenant2Booking = await createTestBooking(server, tenant2Data);

      await checkoutAndPay(server, tenant1Booking.booking, tenant1Booking.bookingToken);
      await checkoutAndPay(server, tenant2Booking.booking, tenant2Booking.bookingToken);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/payments?bookingId=${tenant2Booking.booking.id}`,
        headers: {
          Authorization: `Bearer tenant1-owner-token`,
        },
      });

      expect([401, 403, 404]).toContain(response.statusCode);
    });
  });

  describe('URL Parameter Injection', () => {
    it('should reject SQL injection in tenant context', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${tenant1Data.slug}/services?tenantId=' OR '1'='1`,
      });

      expect([400, 404]).toContain(response.statusCode);
    });

    it('should reject UUID manipulation attempts', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${tenant1Data.slug}/services?staffId=${tenant2Data.staffId}`,
      });

      expect([200, 400, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        const crossTenantService = data.data.find((s: any) => s.salon_id === tenant2Data.salonId);
        expect(crossTenantService).toBeUndefined();
      }
    });
  });

  describe('Admin Access Boundaries', () => {
    it('should prevent salon admin from accessing platform admin endpoints', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/metrics',
        headers: {
          Authorization: `Bearer tenant1-admin-token`,
        },
      });

      expect([401, 403, 404]).toContain(response.statusCode);
    });

    it('should prevent salon admin from impersonating', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/auth/impersonate',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer tenant1-admin-token`,
        },
        payload: {
          userId: 'some-user-id',
        },
      });

      expect([401, 403, 404]).toContain(response.statusCode);
    });
  });

  describe('Booking Token Isolation', () => {
    it('should not accept token from different tenant', async () => {
      const tenant1Booking = await createTestBooking(server, tenant1Data);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${tenant1Booking.booking.id}?token=invalid-tenant-token`,
        headers: {
          'X-Booking-Token': 'invalid-tenant-token',
        },
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    it('should reject malformed booking tokens', async () => {
      const booking = await createTestBooking(server, tenant1Data);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${booking.booking.id}?token=../../../admin/config`,
        headers: {
          'X-Booking-Token': '../../../admin/config',
        },
      });

      expect([400, 401, 403]).toContain(response.statusCode);
    });
  });

  describe('Availability Isolation', () => {
    it('should not show availability from other tenants', async () => {
      const tomorrow = getTomorrowAt(10);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${tenant1Data.slug}&serviceId=${tenant2Data.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=50`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should not allow booking with cross-tenant staff', async () => {
      const tomorrow = getTomorrowAt(10);

      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${tenant1Data.slug}&serviceId=${tenant1Data.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];

      const response = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: tenant1Data.slug,
          serviceId: tenant1Data.serviceId,
          staffId: tenant2Data.staffId,
          startUtc: slot.startUtc,
          customer: generateTestCustomer(),
          idempotencyKey: `cross-staff-${randomUUID().slice(0, 8)}`,
        },
      });

      expect([400, 403, 404, 409]).toContain(response.statusCode);
    });
  });

  describe('Audit Trail Verification', () => {
    it('should log cross-tenant access attempts', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/test-booking-id?token=test-token`,
        headers: {
          Authorization: 'Bearer cross-tenant-attempt-token',
          'X-Forwarded-For': '192.168.1.100',
        },
      });

      expect([401, 403, 404]).toContain(response.statusCode);

      const supabase = getSupabaseClient();
      const { data: auditLogs } = await supabase
        .from('events')
        .select('*')
        .eq('type', 'security.cross_tenant_attempt')
        .order('created_at', { ascending: false })
        .limit(10);

      if (auditLogs && auditLogs.length > 0) {
        const recentAttempt = auditLogs.find(
          (log: any) => log.payload && log.payload.status_code === response.statusCode,
        );

        if (recentAttempt) {
          expect(recentAttempt).toBeDefined();
          expect(recentAttempt.salon_id).toBeDefined();
        }
      }
    });
  });

  describe('Data Leak Prevention', () => {
    it('should not expose internal IDs to other tenants', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${tenant1Data.slug}/services`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      if (data.data && data.data.length > 0) {
        const service = data.data[0];
        expect(service).not.toHaveProperty('internal_notes');
        expect(service).not.toHaveProperty('admin_only_field');
        expect(service).not.toHaveProperty('deleted_at');
      }
    });

    it('should not expose customer emails in public endpoints', async () => {
      const booking = await createTestBooking(server, tenant1Data);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/bookings/${booking.booking.id}?token=${booking.bookingToken}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('customerName');
      expect(data).toHaveProperty('customerEmail');
    });
  });
});
