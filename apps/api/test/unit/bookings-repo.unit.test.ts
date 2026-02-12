import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBooking,
  getBookingById,
  getBookingByIdempotencyKey,
  getBookingsBySalon,
  getBookingsByCustomer,
  updateBookingStatus,
  cancelBooking,
  rescheduleBooking,
  listExpiredPendingBookings,
  expirePendingBookings,
  getBookingStatusHistory,
  getBookingsForStaff,
  getBookingsInDateRange,
  getUpcomingBookings,
  getBookingStats,
  searchBookings,
  bulkUpdateBookingStatus,
  deleteBookingPermanently,
  restoreCancelledBooking,
  validateBookingCanBeCancelled,
  validateBookingCanBeRescheduled,
  getBookingConflicts,
  getOverlappingBookings,
  getBookingsByPaymentStatus,
  getBookingsRequiringAction,
  countBookingsByStatus,
  getBookingRevenueStats,
  getCustomerBookingHistory,
  getStaffBookingStats,
  getServiceBookingStats,
  getBookingCancellationStats,
  getBookingNoShowStats,
  getBookingTrends,
  getPeakBookingTimes,
  getAverageBookingValue,
  getBookingConversionRate,
  getRepeatCustomerRate,
  getBookingRetentionStats,
} from '../../../src/modules/bookings/repo/bookings-repo.js';
import { getSupabaseClient } from '../../../src/server/db.js';

vi.mock('../../../src/server/db.js');

describe('Bookings Repository - Unit Tests', () => {
  let mockClient: any;
  let mockQuery: any;

  beforeEach(() => {
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      count: vi.fn(),
    };

    mockClient = {
      from: vi.fn().mockReturnValue(mockQuery),
    };

    vi.mocked(getSupabaseClient).mockReturnValue(mockClient);
  });

  describe('createBooking', () => {
    it('should create booking with valid data', async () => {
      const mockBooking = {
        id: 'booking-1',
        salon_id: 'salon-1',
        customer_id: 'customer-1',
        staff_id: 'staff-1',
        service_id: 'service-1',
        status: 'pending',
      };

      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await createBooking({
        salonId: 'salon-1',
        customerId: 'customer-1',
        staffId: 'staff-1',
        serviceId: 'service-1',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        status: 'pending',
        totalAmount: 10000,
        currency: 'DKK',
      });

      expect(result).toEqual(expect.objectContaining({ id: 'booking-1' }));
    });

    it('should handle overlap error (23P01)', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: '23P01', message: 'overlap violation' },
      });

      await expect(
        createBooking({
          salonId: 'salon-1',
          customerId: 'customer-1',
          staffId: 'staff-1',
          serviceId: 'service-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          status: 'pending',
          totalAmount: 10000,
          currency: 'DKK',
        }),
      ).rejects.toThrow('BOOKING_TIME_NOT_AVAILABLE');
    });

    it('should handle idempotency conflict (23505)', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'unique violation' },
      });

      await expect(
        createBooking({
          salonId: 'salon-1',
          customerId: 'customer-1',
          staffId: 'staff-1',
          serviceId: 'service-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          status: 'pending',
          totalAmount: 10000,
          currency: 'DKK',
          idempotencyKey: 'test-key',
        }),
      ).rejects.toThrow('BOOKING_IDEMPOTENCY_CONFLICT');
    });

    it('should handle FK violation (23503)', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: '23503', message: 'foreign key violation' },
      });

      await expect(
        createBooking({
          salonId: 'invalid-salon',
          customerId: 'customer-1',
          staffId: 'staff-1',
          serviceId: 'service-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          status: 'pending',
          totalAmount: 10000,
          currency: 'DKK',
        }),
      ).rejects.toThrow('BOOKING_INVALID_REFERENCE');
    });

    it('should handle generic database error', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'UNKNOWN', message: 'Unknown error' },
      });

      await expect(
        createBooking({
          salonId: 'salon-1',
          customerId: 'customer-1',
          staffId: 'staff-1',
          serviceId: 'service-1',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          status: 'pending',
          totalAmount: 10000,
          currency: 'DKK',
        }),
      ).rejects.toThrow('DATABASE_ERROR');
    });

    it('should create booking with optional fields', async () => {
      const mockBooking = {
        id: 'booking-1',
        salon_id: 'salon-1',
        notes: 'Test notes',
        expires_at: '2024-01-15T09:00:00Z',
      };

      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await createBooking({
        salonId: 'salon-1',
        customerId: 'customer-1',
        staffId: 'staff-1',
        serviceId: 'service-1',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        status: 'pending',
        totalAmount: 10000,
        currency: 'DKK',
        notes: 'Test notes',
        expiresAt: '2024-01-15T09:00:00Z',
      });

      expect(result).toBeDefined();
    });
  });

  describe('getBookingById', () => {
    it('should return booking by id', async () => {
      const mockBooking = { id: 'booking-1', status: 'confirmed' };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await getBookingById('booking-1');
      expect(result).toEqual(expect.objectContaining({ id: 'booking-1' }));
    });

    it('should return null for non-existent booking', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null });

      const result = await getBookingById('non-existent');
      expect(result).toBeNull();
    });

    it('should throw on database error', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(getBookingById('booking-1')).rejects.toThrow();
    });
  });

  describe('getBookingByIdempotencyKey', () => {
    it('should return booking by idempotency key', async () => {
      const mockBooking = { id: 'booking-1', idempotency_key: 'key-1' };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await getBookingByIdempotencyKey('key-1');
      expect(result).toEqual(expect.objectContaining({ id: 'booking-1' }));
    });

    it('should return null for non-existent key', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null });

      const result = await getBookingByIdempotencyKey('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getBookingsBySalon', () => {
    it('should return bookings for salon', async () => {
      const mockBookings = [
        { id: 'booking-1', salon_id: 'salon-1' },
        { id: 'booking-2', salon_id: 'salon-1' },
      ];
      mockQuery.order.mockResolvedValue({ data: mockBookings, error: null });

      const result = await getBookingsBySalon('salon-1');
      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const mockBookings = [{ id: 'booking-1', status: 'confirmed' }];
      mockQuery.order.mockResolvedValue({ data: mockBookings, error: null });

      const result = await getBookingsBySalon('salon-1', { status: 'confirmed' });
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'confirmed');
    });

    it('should filter by date range', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await getBookingsBySalon('salon-1', {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });

      expect(mockQuery.gte).toHaveBeenCalled();
      expect(mockQuery.lte).toHaveBeenCalled();
    });

    it('should apply pagination', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await getBookingsBySalon('salon-1', { limit: 10, offset: 20 });

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.range).toHaveBeenCalledWith(20, 29);
    });
  });

  describe('getBookingsByCustomer', () => {
    it('should return bookings for customer', async () => {
      const mockBookings = [{ id: 'booking-1', customer_id: 'customer-1' }];
      mockQuery.order.mockResolvedValue({ data: mockBookings, error: null });

      const result = await getBookingsByCustomer('customer-1');
      expect(result).toHaveLength(1);
    });

    it('should include salon info when requested', async () => {
      const mockBookings = [{ id: 'booking-1', salons: { name: 'Test Salon' } }];
      mockQuery.order.mockResolvedValue({ data: mockBookings, error: null });

      const result = await getBookingsByCustomer('customer-1', { includeSalon: true });
      expect(mockQuery.select).toHaveBeenCalledWith(expect.stringContaining('salons'));
    });
  });

  describe('updateBookingStatus', () => {
    it('should update booking status', async () => {
      const mockBooking = { id: 'booking-1', status: 'confirmed' };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await updateBookingStatus('booking-1', 'confirmed');
      expect(result).toEqual(expect.objectContaining({ status: 'confirmed' }));
    });

    it('should update with reason', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'cancelled',
        cancel_reason: 'Customer request',
      };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await updateBookingStatus('booking-1', 'cancelled', {
        reason: 'Customer request',
      });
      expect(result).toBeDefined();
    });

    it('should throw on invalid status transition', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Invalid status transition' },
      });

      await expect(updateBookingStatus('booking-1', 'invalid-status')).rejects.toThrow();
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking', async () => {
      const mockBooking = { id: 'booking-1', status: 'cancelled' };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await cancelBooking('booking-1', 'Customer request');
      expect(result).toEqual(expect.objectContaining({ status: 'cancelled' }));
    });

    it('should handle already cancelled booking', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Booking already cancelled' },
      });

      await expect(cancelBooking('booking-1', 'Test')).rejects.toThrow();
    });
  });

  describe('rescheduleBooking', () => {
    it('should reschedule booking', async () => {
      const mockBooking = {
        id: 'booking-1',
        start_time: '2024-01-16T10:00:00Z',
        end_time: '2024-01-16T11:00:00Z',
      };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await rescheduleBooking(
        'booking-1',
        '2024-01-16T10:00:00Z',
        '2024-01-16T11:00:00Z',
      );
      expect(result).toBeDefined();
    });

    it('should throw on time conflict', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: '23P01', message: 'overlap violation' },
      });

      await expect(
        rescheduleBooking('booking-1', '2024-01-15T10:00:00Z', '2024-01-15T11:00:00Z'),
      ).rejects.toThrow();
    });
  });

  describe('listExpiredPendingBookings', () => {
    it('should return expired pending bookings', async () => {
      const mockBookings = [
        { id: 'booking-1', status: 'pending', expires_at: '2024-01-14T10:00:00Z' },
      ];
      mockQuery.limit.mockResolvedValue({ data: mockBookings, error: null });

      const result = await listExpiredPendingBookings(10);
      expect(result).toHaveLength(1);
    });

    it('should respect limit parameter', async () => {
      mockQuery.limit.mockResolvedValue({ data: [], error: null });

      await listExpiredPendingBookings(50);
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('expirePendingBookings', () => {
    it('should expire pending bookings', async () => {
      mockQuery.in.mockResolvedValue({ data: null, error: null });

      const result = await expirePendingBookings(['booking-1', 'booking-2']);
      expect(result).toBe(2);
    });

    it('should handle empty array', async () => {
      const result = await expirePendingBookings([]);
      expect(result).toBe(0);
    });
  });

  describe('getBookingStatusHistory', () => {
    it('should return status history', async () => {
      const mockHistory = [
        { id: 'history-1', booking_id: 'booking-1', status: 'pending' },
        { id: 'history-2', booking_id: 'booking-1', status: 'confirmed' },
      ];
      mockQuery.order.mockResolvedValue({ data: mockHistory, error: null });

      const result = await getBookingStatusHistory('booking-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getBookingsForStaff', () => {
    it('should return bookings for staff', async () => {
      const mockBookings = [{ id: 'booking-1', staff_id: 'staff-1' }];
      mockQuery.order.mockResolvedValue({ data: mockBookings, error: null });

      const result = await getBookingsForStaff('staff-1');
      expect(result).toHaveLength(1);
    });

    it('should filter by date', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await getBookingsForStaff('staff-1', { date: '2024-01-15' });
      expect(mockQuery.gte).toHaveBeenCalled();
      expect(mockQuery.lt).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await getBookingsForStaff('staff-1', { status: 'confirmed' });
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'confirmed');
    });
  });

  describe('getBookingsInDateRange', () => {
    it('should return bookings in range', async () => {
      const mockBookings = [
        { id: 'booking-1', start_time: '2024-01-15T10:00:00Z' },
        { id: 'booking-2', start_time: '2024-01-16T10:00:00Z' },
      ];
      mockQuery.order.mockResolvedValue({ data: mockBookings, error: null });

      const result = await getBookingsInDateRange('salon-1', '2024-01-01', '2024-01-31');
      expect(result).toHaveLength(2);
    });

    it('should include customer info', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await getBookingsInDateRange('salon-1', '2024-01-01', '2024-01-31', {
        includeCustomer: true,
      });
      expect(mockQuery.select).toHaveBeenCalledWith(expect.stringContaining('customers'));
    });
  });

  describe('getUpcomingBookings', () => {
    it('should return upcoming bookings', async () => {
      const mockBookings = [{ id: 'booking-1', start_time: '2024-01-16T10:00:00Z' }];
      mockQuery.limit.mockResolvedValue({ data: mockBookings, error: null });

      const result = await getUpcomingBookings('salon-1', 10);
      expect(mockQuery.gt).toHaveBeenCalledWith('start_time', expect.any(String));
    });

    it('should filter by staff', async () => {
      mockQuery.limit.mockResolvedValue({ data: [], error: null });

      await getUpcomingBookings('salon-1', 10, { staffId: 'staff-1' });
      expect(mockQuery.eq).toHaveBeenCalledWith('staff_id', 'staff-1');
    });
  });

  describe('getBookingStats', () => {
    it('should return booking statistics', async () => {
      const mockStats = {
        total: 100,
        confirmed: 80,
        cancelled: 15,
        pending: 5,
      };

      mockQuery.count
        .mockResolvedValueOnce({ count: 100, error: null })
        .mockResolvedValueOnce({ count: 80, error: null })
        .mockResolvedValueOnce({ count: 15, error: null })
        .mockResolvedValueOnce({ count: 5, error: null });

      const result = await getBookingStats('salon-1', '2024-01-01', '2024-01-31');
      expect(result).toEqual(expect.objectContaining({ total: 100 }));
    });
  });

  describe('searchBookings', () => {
    it('should search by customer name', async () => {
      const mockBookings = [{ id: 'booking-1', customers: { name: 'John Doe' } }];
      mockQuery.order.mockResolvedValue({ data: mockBookings, error: null });

      const result = await searchBookings('salon-1', 'John');
      expect(mockQuery.ilike).toHaveBeenCalled();
    });

    it('should search by customer email', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await searchBookings('salon-1', 'john@example.com');
      expect(mockQuery.ilike).toHaveBeenCalled();
    });

    it('should search by booking id', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });

      await searchBookings('salon-1', 'booking-uuid');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'booking-uuid');
    });
  });

  describe('bulkUpdateBookingStatus', () => {
    it('should update multiple bookings', async () => {
      mockQuery.in.mockResolvedValue({ data: null, error: null });

      const result = await bulkUpdateBookingStatus(['booking-1', 'booking-2'], 'confirmed');
      expect(result).toBe(2);
    });

    it('should handle empty array', async () => {
      const result = await bulkUpdateBookingStatus([], 'confirmed');
      expect(result).toBe(0);
    });
  });

  describe('deleteBookingPermanently', () => {
    it('should permanently delete booking', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: null });

      const result = await deleteBookingPermanently('booking-1');
      expect(result).toBe(true);
    });

    it('should fail if booking has payments', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Cannot delete booking with payments' },
      });

      await expect(deleteBookingPermanently('booking-1')).rejects.toThrow();
    });
  });

  describe('restoreCancelledBooking', () => {
    it('should restore cancelled booking', async () => {
      const mockBooking = { id: 'booking-1', status: 'pending' };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await restoreCancelledBooking('booking-1');
      expect(result).toEqual(expect.objectContaining({ status: 'pending' }));
    });

    it('should throw if booking not cancelled', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Booking not in cancelled status' },
      });

      await expect(restoreCancelledBooking('booking-1')).rejects.toThrow();
    });
  });

  describe('validateBookingCanBeCancelled', () => {
    it('should return true for cancellable booking', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'confirmed',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await validateBookingCanBeCancelled('booking-1');
      expect(result.canCancel).toBe(true);
    });

    it('should return false for completed booking', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'completed',
        start_time: new Date(Date.now() - 86400000).toISOString(),
      };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await validateBookingCanBeCancelled('booking-1');
      expect(result.canCancel).toBe(false);
    });

    it('should return false if within cancellation window', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'confirmed',
        start_time: new Date(Date.now() + 1800000).toISOString(),
      };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await validateBookingCanBeCancelled('booking-1', 60);
      expect(result.canCancel).toBe(false);
    });
  });

  describe('validateBookingCanBeRescheduled', () => {
    it('should return true for reschedulable booking', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'confirmed',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await validateBookingCanBeRescheduled('booking-1');
      expect(result.canReschedule).toBe(true);
    });

    it('should return false for cancelled booking', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'cancelled',
        start_time: new Date(Date.now() + 86400000).toISOString(),
      };
      mockQuery.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await validateBookingCanBeRescheduled('booking-1');
      expect(result.canReschedule).toBe(false);
    });
  });

  describe('getBookingConflicts', () => {
    it('should return conflicting bookings', async () => {
      const mockConflicts = [
        { id: 'booking-2', start_time: '2024-01-15T10:30:00Z', end_time: '2024-01-15T11:30:00Z' },
      ];
      mockQuery.neq.mockResolvedValue({ data: mockConflicts, error: null });

      const result = await getBookingConflicts(
        'salon-1',
        'staff-1',
        'booking-1',
        '2024-01-15T10:00:00Z',
        '2024-01-15T11:00:00Z',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getOverlappingBookings', () => {
    it('should return overlapping bookings', async () => {
      const mockBookings = [{ id: 'booking-1', start_time: '2024-01-15T10:00:00Z' }];
      mockQuery.order.mockResolvedValue({ data: mockBookings, error: null });

      const result = await getOverlappingBookings(
        'salon-1',
        '2024-01-15T10:00:00Z',
        '2024-01-15T11:00:00Z',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getBookingsByPaymentStatus', () => {
    it('should return bookings by payment status', async () => {
      const mockBookings = [{ id: 'booking-1', payment_status: 'succeeded' }];
      mockQuery.order.mockResolvedValue({ data: mockBookings, error: null });

      const result = await getBookingsByPaymentStatus('salon-1', 'succeeded');
      expect(result).toHaveLength(1);
    });
  });

  describe('getBookingsRequiringAction', () => {
    it('should return bookings requiring action', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          status: 'pending',
          expires_at: new Date(Date.now() - 1000).toISOString(),
        },
      ];
      mockQuery.limit.mockResolvedValue({ data: mockBookings, error: null });

      const result = await getBookingsRequiringAction('salon-1');
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('countBookingsByStatus', () => {
    it('should count bookings by status', async () => {
      mockQuery.count.mockResolvedValue({ count: 10, error: null });

      const result = await countBookingsByStatus('salon-1');
      expect(result).toEqual(expect.any(Object));
    });
  });

  describe('getBookingRevenueStats', () => {
    it('should return revenue statistics', async () => {
      const mockStats = { total_revenue: 100000, average_value: 50000 };
      mockQuery.single.mockResolvedValue({ data: mockStats, error: null });

      const result = await getBookingRevenueStats('salon-1', '2024-01-01', '2024-01-31');
      expect(result).toBeDefined();
    });
  });

  describe('getCustomerBookingHistory', () => {
    it('should return customer booking history', async () => {
      const mockHistory = { total_bookings: 5, last_booking: '2024-01-15' };
      mockQuery.single.mockResolvedValue({ data: mockHistory, error: null });

      const result = await getCustomerBookingHistory('customer-1', 'salon-1');
      expect(result).toBeDefined();
    });
  });

  describe('getStaffBookingStats', () => {
    it('should return staff booking statistics', async () => {
      const mockStats = { total_bookings: 20, total_revenue: 200000 };
      mockQuery.single.mockResolvedValue({ data: mockStats, error: null });

      const result = await getStaffBookingStats('staff-1', '2024-01-01', '2024-01-31');
      expect(result).toBeDefined();
    });
  });

  describe('getServiceBookingStats', () => {
    it('should return service booking statistics', async () => {
      const mockStats = { total_bookings: 30, total_revenue: 300000 };
      mockQuery.single.mockResolvedValue({ data: mockStats, error: null });

      const result = await getServiceBookingStats(
        'service-1',
        'salon-1',
        '2024-01-01',
        '2024-01-31',
      );
      expect(result).toBeDefined();
    });
  });

  describe('getBookingCancellationStats', () => {
    it('should return cancellation statistics', async () => {
      const mockStats = { total_cancelled: 5, cancellation_rate: 0.05 };
      mockQuery.single.mockResolvedValue({ data: mockStats, error: null });

      const result = await getBookingCancellationStats('salon-1', '2024-01-01', '2024-01-31');
      expect(result).toBeDefined();
    });
  });

  describe('getBookingNoShowStats', () => {
    it('should return no-show statistics', async () => {
      const mockStats = { total_no_shows: 2, no_show_rate: 0.02 };
      mockQuery.single.mockResolvedValue({ data: mockStats, error: null });

      const result = await getBookingNoShowStats('salon-1', '2024-01-01', '2024-01-31');
      expect(result).toBeDefined();
    });
  });

  describe('getBookingTrends', () => {
    it('should return booking trends', async () => {
      const mockTrends = [
        { date: '2024-01-01', count: 5 },
        { date: '2024-01-02', count: 8 },
      ];
      mockQuery.order.mockResolvedValue({ data: mockTrends, error: null });

      const result = await getBookingTrends('salon-1', '2024-01-01', '2024-01-31');
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('getPeakBookingTimes', () => {
    it('should return peak booking times', async () => {
      const mockPeaks = [
        { hour: 10, count: 15 },
        { hour: 14, count: 12 },
      ];
      mockQuery.order.mockResolvedValue({ data: mockPeaks, error: null });

      const result = await getPeakBookingTimes('salon-1', '2024-01-01', '2024-01-31');
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('getAverageBookingValue', () => {
    it('should return average booking value', async () => {
      const mockResult = { average: 50000 };
      mockQuery.single.mockResolvedValue({ data: mockResult, error: null });

      const result = await getAverageBookingValue('salon-1', '2024-01-01', '2024-01-31');
      expect(result).toBeDefined();
    });
  });

  describe('getBookingConversionRate', () => {
    it('should return conversion rate', async () => {
      const mockResult = { conversion_rate: 0.75 };
      mockQuery.single.mockResolvedValue({ data: mockResult, error: null });

      const result = await getBookingConversionRate('salon-1', '2024-01-01', '2024-01-31');
      expect(result).toBeDefined();
    });
  });

  describe('getRepeatCustomerRate', () => {
    it('should return repeat customer rate', async () => {
      const mockResult = { repeat_rate: 0.6 };
      mockQuery.single.mockResolvedValue({ data: mockResult, error: null });

      const result = await getRepeatCustomerRate('salon-1', '2024-01-01', '2024-01-31');
      expect(result).toBeDefined();
    });
  });

  describe('getBookingRetentionStats', () => {
    it('should return retention statistics', async () => {
      const mockResult = { retention_rate: 0.8, churn_rate: 0.2 };
      mockQuery.single.mockResolvedValue({ data: mockResult, error: null });

      const result = await getBookingRetentionStats('salon-1', '2024-01-01', '2024-01-31');
      expect(result).toBeDefined();
    });
  });
});
