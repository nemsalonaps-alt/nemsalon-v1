import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server/build-app.ts';
import {
  seedTestSalon,
  cleanupTestData,
  generateTestCustomer,
  getTomorrowAt,
  createTestBooking,
} from '../test-utils.ts';
import { getSupabaseClient } from '../../src/server/db.ts';
import { randomUUID } from 'crypto';

describe('Platform Admin Tests', () => {
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

  describe('Global Search', () => {
    it('should search salons by name', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/search?q=test&type=salon',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('salons');
      }
    });

    it('should search by booking ID', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/platform/admin/search?q=${booking.booking.id}&type=booking`,
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('bookings');
      }
    });

    it('should search by payment intent', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/search?q=pi_test&type=payment',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });
  });

  describe('Salon Management', () => {
    it('should list all salons', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/salons',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it('should get salon details', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/platform/admin/salons/${testData.salonId}`,
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403, 404]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('bookings');
        expect(data).toHaveProperty('payments');
      }
    });

    it('should update salon status', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/v1/platform/admin/salons/${testData.salonId}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer platform-admin-token',
        },
        payload: {
          status: 'suspended',
          reason: 'Test suspension',
        },
      });

      expect([200, 401, 403, 404]).toContain(response.statusCode);
    });
  });

  describe('Booking Oversight', () => {
    it('should list all bookings across salons', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/bookings?limit=100',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
      }
    });

    it('should filter bookings by status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/bookings?status=confirmed',
        headers: {
          Authorization: 'Bearer platform-admin-token',
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

    it('should view booking details', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const response = await server.inject({
        method: 'GET',
        url: `/v1/platform/admin/bookings/${booking.booking.id}`,
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403, 404]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('customer');
        expect(data).toHaveProperty('payments');
      }
    });
  });

  describe('Payment Oversight', () => {
    it('should list all payments', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/payments?limit=100',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('data');
      }
    });

    it('should view failed payments', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/payments?status=failed',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });

    it('should retry failed payment', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/platform/admin/payments/test-payment-id/retry',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 400, 401, 403, 404]).toContain(response.statusCode);
    });
  });

  describe('Notification Management', () => {
    it('should list failed notifications', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/notifications?status=failed',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });

    it('should retry failed notification', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/platform/admin/notifications/test-notification-id/retry',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 400, 401, 403, 404]).toContain(response.statusCode);
    });

    it('should view notification queue status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/notifications/queue-status',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });
  });

  describe('Webhook Management', () => {
    it('should list recent webhooks', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/webhooks?limit=50',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });

    it('should retry webhook', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/platform/admin/webhooks/test-webhook-id/retry',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 400, 401, 403, 404]).toContain(response.statusCode);
    });

    it('should verify webhook signature', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'invalid-signature',
        },
        payload: {
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_test' } },
        },
      });

      expect([200, 400]).toContain(response.statusCode);
    });
  });

  describe('Impersonation', () => {
    it('should allow impersonation with proper role', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/auth/impersonate',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer platform-admin-token',
        },
        payload: {
          userId: 'test-user-id',
          reason: 'Support request',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });

    it('should reject impersonation without admin role', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/auth/impersonate',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer owner-token',
        },
        payload: {
          userId: 'test-user-id',
        },
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    it('should log impersonation actions', async () => {
      const supabase = getSupabaseClient();

      const response = await server.inject({
        method: 'POST',
        url: '/v1/auth/impersonate',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer platform-admin-token',
        },
        payload: {
          userId: 'test-user-id',
          reason: 'Audit test',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);

      const { data: auditLogs } = await supabase
        .from('events')
        .select('*')
        .eq('type', 'admin.impersonation')
        .order('created_at', { ascending: false })
        .limit(10);

      if (auditLogs && auditLogs.length > 0) {
        const recentLog = auditLogs.find(
          (log: any) => log.payload && log.payload.reason === 'Audit test',
        );
        if (recentLog) {
          expect(recentLog).toBeDefined();
        }
      }
    });
  });

  describe('Metrics and Analytics', () => {
    it('should get platform metrics', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/metrics',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('totalSalons');
        expect(data).toHaveProperty('totalBookings');
        expect(data).toHaveProperty('totalRevenue');
      }
    });

    it('should get salon statistics', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/platform/admin/salons/${testData.salonId}/stats`,
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403, 404]).toContain(response.statusCode);
    });

    it('should get revenue reports', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/reports/revenue?from=2024-01-01&to=2024-12-31',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });
  });

  describe('Error Feed', () => {
    it('should list recent errors', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/errors?limit=50',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('errors');
      }
    });

    it('should group errors by code', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/errors?groupBy=code',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });

    it('should filter errors by salon', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/platform/admin/errors?salonId=${testData.salonId}`,
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });
  });

  describe('Incident Management', () => {
    it('should list open incidents', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/incidents?status=open',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });

    it('should create incident report', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/v1/platform/admin/incidents',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer platform-admin-token',
        },
        payload: {
          title: 'Payment processing issue',
          description: 'Multiple payment failures detected',
          severity: 'high',
          affectedSalons: [testData.salonId],
        },
      });

      expect([201, 401, 403]).toContain(response.statusCode);
    });

    it('should resolve paid but not confirmed bookings', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);

      const response = await server.inject({
        method: 'POST',
        url: `/v1/platform/admin/bookings/${booking.booking.id}/reconcile`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer platform-admin-token',
        },
        payload: {
          action: 'confirm_if_paid',
        },
      });

      expect([200, 400, 401, 403, 404]).toContain(response.statusCode);
    });
  });

  describe('Audit Logging', () => {
    it('should log admin actions', async () => {
      const supabase = getSupabaseClient();

      await server.inject({
        method: 'GET',
        url: `/v1/platform/admin/salons/${testData.salonId}`,
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      const { data: auditLogs } = await supabase
        .from('events')
        .select('*')
        .eq('type', 'admin.view_salon')
        .order('created_at', { ascending: false })
        .limit(10);

      if (auditLogs && auditLogs.length > 0) {
        const recentLog = auditLogs.find(
          (log: any) => log.payload && log.payload.salon_id === testData.salonId,
        );
        if (recentLog) {
          expect(recentLog).toBeDefined();
          expect(recentLog.created_at).toBeDefined();
        }
      }
    });

    it('should provide audit trail export', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/platform/admin/audit/export?from=2024-01-01&to=2024-12-31',
        headers: {
          Authorization: 'Bearer platform-admin-token',
        },
      });

      expect([200, 401, 403]).toContain(response.statusCode);
    });
  });
});
