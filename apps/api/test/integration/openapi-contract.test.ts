import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server/build-app.ts';
import { getSupabaseClient } from '../../src/server/db.ts';
import {
  seedTestSalon,
  cleanupTestData,
  generateTestCustomer,
  getTomorrowAt,
} from '../test-utils.ts';
import { randomUUID } from 'crypto';

describe('OpenAPI Contract Tests', () => {
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

  describe('Public Salon Endpoints', () => {
    it('GET /v1/public/salons/{slug} should match OpenAPI schema', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('slug');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timezone');
      expect(data).toHaveProperty('locale');
      expect(data).toHaveProperty('currency');
      expect(typeof data.id).toBe('string');
      expect(typeof data.name).toBe('string');
      expect(typeof data.slug).toBe('string');
      expect(['active', 'inactive', 'suspended']).toContain(data.status);
    });

    it('GET /v1/public/salons/{slug}/services should match OpenAPI schema', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}/services`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const service = data.data[0];
        expect(service).toHaveProperty('id');
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('duration_minutes');
        expect(service).toHaveProperty('price_amount');
        expect(service).toHaveProperty('currency');
        expect(service).toHaveProperty('active');
        expect(typeof service.duration_minutes).toBe('number');
        expect(typeof service.price_amount).toBe('number');
      }
    });

    it('GET /v1/public/salons/{slug}/staff should match OpenAPI schema', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}/staff`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const staff = data.data[0];
        expect(staff).toHaveProperty('id');
        expect(staff).toHaveProperty('display_name');
        expect(staff).toHaveProperty('role');
        expect(staff).toHaveProperty('active');
        expect(['owner', 'admin', 'staff']).toContain(staff.role);
      }
    });
  });

  describe('Availability Endpoints', () => {
    it('GET /v1/public/availability should match OpenAPI schema', async () => {
      const tomorrow = getTomorrowAt(10);
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=2&limit=10`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('slots');
      expect(Array.isArray(data.slots)).toBe(true);
      expect(data).toHaveProperty('meta');
      expect(data.meta).toHaveProperty('timezone');
      expect(data.meta).toHaveProperty('intervalMinutes');

      if (data.slots.length > 0) {
        const slot = data.slots[0];
        expect(slot).toHaveProperty('startUtc');
        expect(slot).toHaveProperty('endUtc');
        expect(slot).toHaveProperty('staffId');
        expect(slot).toHaveProperty('available');
        expect(typeof slot.startUtc).toBe('string');
        expect(typeof slot.endUtc).toBe('string');
      }
    });
  });

  describe('Booking Endpoints', () => {
    it('POST /v1/public/bookings should match OpenAPI request schema', async () => {
      const tomorrow = getTomorrowAt(10);

      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`,
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
          customer: generateTestCustomer(),
          idempotencyKey: `contract-test-${randomUUID().slice(0, 8)}`,
        },
      });

      expect([201, 400, 409]).toContain(response.statusCode);

      if (response.statusCode === 201) {
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('booking');
        expect(data).toHaveProperty('bookingToken');
        expect(data).toHaveProperty('expiresAt');

        const booking = data.booking;
        expect(booking).toHaveProperty('id');
        expect(booking).toHaveProperty('status');
        expect(booking).toHaveProperty('startTime');
        expect(booking).toHaveProperty('endTime');
        expect(['pending', 'confirmed', 'cancelled', 'completed']).toContain(booking.status);
      }
    });

    it('GET /v1/public/bookings/{id} should match OpenAPI response schema', async () => {
      const customer = generateTestCustomer();

      const tomorrow = getTomorrowAt(10);
      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];

      const createResponse = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer,
          idempotencyKey: `retrieve-test-${randomUUID().slice(0, 8)}`,
        },
      });

      if (createResponse.statusCode === 201) {
        const createData = JSON.parse(createResponse.body);

        const response = await server.inject({
          method: 'GET',
          url: `/v1/public/bookings/${createData.booking.id}?token=${createData.bookingToken}`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);

        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('customerName');
        expect(data).toHaveProperty('customerEmail');
        expect(data).toHaveProperty('serviceName');
        expect(data).toHaveProperty('staffName');
        expect(data).toHaveProperty('salonEmail');
        expect(data).toHaveProperty('salonPhone');
      }
    });
  });

  describe('Checkout Endpoints', () => {
    it('POST /v1/public/bookings/{id}/checkout should match OpenAPI schema', async () => {
      const tomorrow = getTomorrowAt(10);

      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];

      const createResponse = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer: generateTestCustomer(),
          idempotencyKey: `checkout-test-${randomUUID().slice(0, 8)}`,
        },
      });

      if (createResponse.statusCode === 201) {
        const createData = JSON.parse(createResponse.body);
        const publicUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';

        const response = await server.inject({
          method: 'POST',
          url: `/v1/public/bookings/${createData.booking.id}/checkout`,
          headers: {
            'Content-Type': 'application/json',
            'X-Booking-Token': createData.bookingToken,
          },
          payload: {
            successUrl: `${publicUrl}/success`,
            cancelUrl: `${publicUrl}/cancel`,
          },
        });

        expect([201, 400, 409]).toContain(response.statusCode);

        if (response.statusCode === 201) {
          const data = JSON.parse(response.body);
          expect(data).toHaveProperty('checkoutUrl');
          expect(data).toHaveProperty('paymentId');
          expect(data).toHaveProperty('provider');
          expect(data.provider).toBe('stripe');
        }
      }
    });
  });

  describe('Error Response Schema', () => {
    it('should return proper error schema for 404', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/public/salons/non-existent-salon-12345',
      });

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('message');
      expect(typeof data.code).toBe('string');
      expect(typeof data.message).toBe('string');
    });

    it('should return proper error schema for 400 validation errors', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/public/availability?salonSlug=invalid-uuid&serviceId=invalid-uuid&from=invalid-date&days=100',
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('message');
    });

    it('should return proper error schema for 401 unauthorized', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/bookings',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect([401, 403]).toContain(response.statusCode);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('message');
    });
  });

  describe('Response Headers Schema', () => {
    it('should include proper rate limit headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}`,
      });

      expect(response.statusCode).toBe(200);

      const headers = response.headers;
      expect(typeof headers['x-ratelimit-limit']).toBe('string');
      expect(typeof headers['x-ratelimit-remaining']).toBe('string');
    });

    it('should include proper content type', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}`,
      });

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Pagination Schema', () => {
    it('should include pagination metadata in list endpoints', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}/services`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('meta');
      expect(data.meta).toHaveProperty('total');
      expect(typeof data.meta.total).toBe('number');
    });
  });

  describe('DateTime Format Compliance', () => {
    it('should use ISO 8601 format for all datetime fields', async () => {
      const tomorrow = getTomorrowAt(10);

      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=1&limit=1`,
      });

      if (slotsResponse.statusCode === 200) {
        const data = JSON.parse(slotsResponse.body);

        if (data.slots && data.slots.length > 0) {
          const slot = data.slots[0];

          expect(slot.startUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/);
          expect(slot.endUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/);
        }
      }
    });
  });

  describe('Currency Format Compliance', () => {
    it('should use integer for price amounts (no floats)', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}/services`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      if (data.data && data.data.length > 0) {
        const service = data.data[0];
        expect(Number.isInteger(service.price_amount)).toBe(true);
        expect(service.price_amount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should use valid ISO 4217 currency codes', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/salons/${testData.slug}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(['DKK', 'EUR', 'USD', 'GBP']).toContain(data.currency);
    });
  });

  describe('Enum Value Compliance', () => {
    it('should use valid booking status values', async () => {
      const tomorrow = getTomorrowAt(10);

      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];

      const createResponse = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer: generateTestCustomer(),
          idempotencyKey: `status-test-${randomUUID().slice(0, 8)}`,
        },
      });

      if (createResponse.statusCode === 201) {
        const createData = JSON.parse(createResponse.body);
        const booking = createData.booking;

        expect(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).toContain(
          booking.status,
        );
      }
    });

    it('should use valid payment status values', async () => {
      const tomorrow = getTomorrowAt(10);

      const slotsResponse = await server.inject({
        method: 'GET',
        url: `/v1/public/availability?salonSlug=${testData.slug}&serviceId=${testData.serviceId}&from=${tomorrow.toISOString()}&days=7&limit=5`,
      });

      const slotsData = JSON.parse(slotsResponse.body);
      const slot = slotsData.slots[0];

      const createResponse = await server.inject({
        method: 'POST',
        url: '/v1/public/bookings',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          salonSlug: testData.slug,
          serviceId: testData.serviceId,
          staffId: slot.staffId,
          startUtc: slot.startUtc,
          customer: generateTestCustomer(),
          idempotencyKey: `payment-status-test-${randomUUID().slice(0, 8)}`,
        },
      });

      if (createResponse.statusCode === 201) {
        const createData = JSON.parse(createResponse.body);
        const booking = createData.booking;

        expect([null, 'pending', 'succeeded', 'failed', 'refunded']).toContain(
          booking.paymentStatus,
        );
      }
    });
  });
});
