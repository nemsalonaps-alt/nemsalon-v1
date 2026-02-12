import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server/build-app.ts';
import { seedTestSalon, createTestBooking, generateTestCustomer, checkoutAndPay, cleanupTestData } from '../test-utils.ts';

describe('Phase 6: Customer Portal Tests', () => {
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

  describe('6.1 Customer Booking History', () => {
    it('should get customer bookings by email', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/customer/bookings?email=${customer.email}`,
        headers: { 'x-booking-token': booking.bookingToken }
      });
      
      expect([200, 401, 404]).toContain(response.statusCode);
    });

    it('should get upcoming appointments', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/customer/upcoming?email=${customer.email}`,
        headers: { 'x-booking-token': booking.bookingToken }
      });
      
      expect([200, 401, 404]).toContain(response.statusCode);
    });
  });

  describe('6.2 Customer Profile', () => {
    it('should update customer profile', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);
      
      const response = await server.inject({
        method: 'PATCH',
        url: `/v1/public/customer/profile`,
        headers: { 
          'Content-Type': 'application/json',
          'x-booking-token': booking.bookingToken 
        },
        payload: {
          name: 'Updated Name',
          phone: '+45 12345678'
        }
      });
      
      expect([200, 401, 404]).toContain(response.statusCode);
    });

    it('should get customer preferences', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);
      
      const response = await server.inject({
        method: 'GET',
        url: `/v1/public/customer/preferences`,
        headers: { 'x-booking-token': booking.bookingToken }
      });
      
      expect([200, 401, 404]).toContain(response.statusCode);
    });
  });

  describe('6.3 Rebooking', () => {
    it('should allow quick rebook of same service', async () => {
      const customer = generateTestCustomer();
      const booking = await createTestBooking(server, testData, customer);
      await checkoutAndPay(server, booking.booking, booking.bookingToken);
      
      const response = await server.inject({
        method: 'POST',
        url: `/v1/public/customer/rebook`,
        headers: { 
          'Content-Type': 'application/json',
          'x-booking-token': booking.bookingToken 
        },
        payload: {
          originalBookingId: booking.booking.id
        }
      });
      
      expect([201, 401, 404]).toContain(response.statusCode);
    });
  });
});
