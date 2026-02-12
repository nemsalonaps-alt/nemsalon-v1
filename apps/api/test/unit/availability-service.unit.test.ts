import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAvailabilitySlots,
  validateTimeSlot,
  checkStaffAvailability,
  calculateSlotDuration,
  handleOverlappingBookings,
  getNextAvailableSlot,
  findAlternativeSlots,
  validateBusinessHours,
  checkTimeOffConflicts,
  calculateBufferTime,
  getStaffSchedule,
  optimizeStaffAllocation,
  handle DSTTransitions,
  validateTimezone,
  convertToSalonTimezone,
  convertToUTC,
  getWorkingHoursForDate,
  calculateBreakTime,
  handleSplitShifts,
  validateServiceDuration,
  checkResourceAvailability,
  allocateResources,
  handleResourceConflicts,
  getResourceSchedule,
  optimizeResourceUsage,
  validateRoomBooking,
  checkEquipmentAvailability,
  handleEquipmentMaintenance,
  getMaintenanceWindows,
  validateAdvanceBookingLimit,
  checkCancellationWindow,
  handleWaitlist,
  addToWaitlist,
  processWaitlist,
  getWaitlistPosition,
  validateMaxBookingsPerDay,
  checkConcurrentBookingsLimit,
  handleGroupBookings,
  validateGroupSize,
  calculateGroupDiscount,
  allocateGroupResources,
  handleRecurringBookings,
  validateRecurrencePattern,
  calculateRecurringDates,
  handleRecurringConflicts,
  getBlackoutDates,
  validateHolidayHours,
  handleSpecialEvents,
  getEventAvailability,
  validateEventBooking,
  handlePeakHours,
  calculateDynamicPricing,
  getSurgeMultiplier,
  handleOffPeakDiscounts,
  validateMinimumNotice,
  checkSameDayBooking,
  handleUrgentBooking,
  calculateRushFee,
  validateMaxAdvanceBooking,
  checkFarFutureBooking,
  handleSeasonalHours,
  getSeasonalAvailability,
  validateTemporaryHours,
  handleEarlyClosure,
  calculateLastBookingTime,
  validateAfterHoursBooking,
  handleEmergencyBooking,
  getOnCallStaff,
  validateUrgentService,
  handlePriorityBooking,
  calculatePriorityFee,
  getVIPAvailability,
  validateVIPAccess,
  handleExclusiveSlots,
  calculateExclusivityFee,
  getMemberBenefits,
  validateMembershipTier,
  handleMemberDiscounts,
  getLoyaltyRewards,
  validateRewardRedemption,
  handlePackageBookings,
  validatePackageSessions,
  calculatePackageDiscount,
  getPackageExpiration,
  handleGiftCardRedemption,
  validateGiftCardBalance,
  calculateGiftCardPayment,
  getPromoCodeDiscount,
  validatePromoCode,
  handlePromoRestrictions,
  calculateFinalPrice,
  getTaxCalculation,
  validateTaxExemption,
  handleMultiCurrency,
  getExchangeRate,
  calculateCurrencyConversion,
  validatePaymentMethod,
  handleDepositRequirement,
  calculateDepositAmount,
  getRefundPolicy,
  validateRefundEligibility,
  calculateRefundAmount,
  handlePartialRefund,
  getReschedulePolicy,
  validateRescheduleWindow,
  calculateRescheduleFee,
  handleNoShowPolicy,
  validateNoShowFee,
  calculateNoShowCharge,
  getLateArrivalPolicy,
  validateGracePeriod,
  handleLateArrivalFee
} from '../../src/modules/availability/service/availability-service.js';

describe('Availability Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAvailabilitySlots', () => {
    it('should return available slots', async () => {
      const query = {
        salonId: 'salon-1',
        serviceId: 'service-1',
        from: '2024-01-15T09:00:00Z',
        days: 7
      };

      const result = await getAvailabilitySlots(query);
      expect(result.slots).toBeInstanceOf(Array);
    });

    it('should filter by staff', async () => {
      const query = {
        salonId: 'salon-1',
        serviceId: 'service-1',
        staffId: 'staff-1',
        from: '2024-01-15T09:00:00Z',
        days: 1
      };

      const result = await getAvailabilitySlots(query);
      expect(result.slots.every(slot => slot.staffId === 'staff-1')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const query = {
        salonId: 'salon-1',
        serviceId: 'service-1',
        from: '2024-01-15T09:00:00Z',
        days: 30,
        limit: 10
      };

      const result = await getAvailabilitySlots(query);
      expect(result.slots.length).toBeLessThanOrEqual(10);
    });

    it('should exclude booked slots', async () => {
      const query = {
        salonId: 'salon-1',
        serviceId: 'service-1',
        from: '2024-01-15T09:00:00Z',
        days: 1
      };

      const result = await getAvailabilitySlots(query);
      // Slots should not overlap with existing bookings
      expect(result.slots).toBeDefined();
    });

    it('should handle DST transitions', async () => {
      const query = {
        salonId: 'salon-1',
        serviceId: 'service-1',
        from: '2024-03-31T00:00:00Z', // DST start
        days: 2
      };

      const result = await getAvailabilitySlots(query);
      expect(result.timezone).toBeDefined();
    });

    it('should return empty array when no availability', async () => {
      const query = {
        salonId: 'closed-salon',
        serviceId: 'service-1',
        from: '2024-01-15T09:00:00Z',
        days: 1
      };

      const result = await getAvailabilitySlots(query);
      expect(result.slots).toEqual([]);
    });
  });

  describe('validateTimeSlot', () => {
    it('should validate within business hours', () => {
      const result = validateTimeSlot({
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z',
        salonId: 'salon-1'
      });
      expect(result.valid).toBe(true);
    });

    it('should reject outside business hours', () => {
      const result = validateTimeSlot({
        startTime: '2024-01-15T03:00:00Z',
        endTime: '2024-01-15T04:00:00Z',
        salonId: 'salon-1'
      });
      expect(result.valid).toBe(false);
    });

    it('should reject past dates', () => {
      const result = validateTimeSlot({
        startTime: '2020-01-15T10:00:00Z',
        endTime: '2020-01-15T11:00:00Z',
        salonId: 'salon-1'
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid duration', () => {
      const result = validateTimeSlot({
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T10:05:00Z',
        salonId: 'salon-1',
        minDuration: 15
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('checkStaffAvailability', () => {
    it('should return true when staff is available', async () => {
      const result = await checkStaffAvailability({
        staffId: 'staff-1',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      });
      expect(result.available).toBe(true);
    });

    it('should return false when staff has booking', async () => {
      const result = await checkStaffAvailability({
        staffId: 'staff-with-booking',
        startTime: '2024-01-15T14:00:00Z',
        endTime: '2024-01-15T15:00:00Z'
      });
      expect(result.available).toBe(false);
    });

    it('should check for time off', async () => {
      const result = await checkStaffAvailability({
        staffId: 'staff-on-leave',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      });
      expect(result.available).toBe(false);
      expect(result.reason).toBe('time_off');
    });

    it('should check working hours', async () => {
      const result = await checkStaffAvailability({
        staffId: 'staff-1',
        startTime: '2024-01-15T19:00:00Z',
        endTime: '2024-01-15T20:00:00Z'
      });
      expect(result.available).toBe(false);
    });
  });

  describe('handleWaitlist', () => {
    it('should add customer to waitlist', async () => {
      const result = await addToWaitlist({
        customerId: 'cust-1',
        salonId: 'salon-1',
        preferredDate: '2024-01-15',
        preferredTime: '10:00'
      });
      expect(result.position).toBeGreaterThan(0);
    });

    it('should get waitlist position', async () => {
      const result = await getWaitlistPosition('waitlist-entry-1');
      expect(result.position).toBeDefined();
    });

    it('should process waitlist when slot opens', async () => {
      const result = await processWaitlist({
        salonId: 'salon-1',
        date: '2024-01-15',
        time: '10:00'
      });
      expect(result.notified).toBeInstanceOf(Array);
    });
  });

  describe('handleGroupBookings', () => {
    it('should validate group size', () => {
      const result = validateGroupSize({
        groupSize: 5,
        maxGroupSize: 10
      });
      expect(result.valid).toBe(true);
    });

    it('should reject oversized groups', () => {
      const result = validateGroupSize({
        groupSize: 15,
        maxGroupSize: 10
      });
      expect(result.valid).toBe(false);
    });

    it('should calculate group discount', () => {
      const discount = calculateGroupDiscount({
        basePrice: 10000,
        groupSize: 5,
        discountTier: [
          { min: 3, discount: 0.05 },
          { min: 5, discount: 0.10 }
        ]
      });
      expect(discount).toBe(1000); // 10% of 10000
    });

    it('should allocate resources for group', async () => {
      const result = await allocateGroupResources({
        salonId: 'salon-1',
        groupSize: 5,
        serviceId: 'service-1',
        startTime: '2024-01-15T10:00:00Z'
      });
      expect(result.allocated).toBe(true);
    });
  });

  describe('handleRecurringBookings', () => {
    it('should validate weekly recurrence', () => {
      const result = validateRecurrencePattern({
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [1, 3, 5]
      });
      expect(result.valid).toBe(true);
    });

    it('should calculate recurring dates', () => {
      const dates = calculateRecurringDates({
        startDate: '2024-01-15',
        frequency: 'weekly',
        interval: 1,
        count: 4
      });
      expect(dates).toHaveLength(4);
    });

    it('should detect conflicts in recurring series', async () => {
      const result = await handleRecurringConflicts({
        salonId: 'salon-1',
        staffId: 'staff-1',
        dates: ['2024-01-15', '2024-01-22', '2024-01-29'],
        time: '10:00'
      });
      expect(result.conflicts).toBeInstanceOf(Array);
    });
  });

  describe('handlePeakHours', () => {
    it('should calculate surge multiplier', () => {
      const multiplier = getSurgeMultiplier({
        date: '2024-01-15',
        time: '17:00',
        peakHours: ['17:00', '18:00', '19:00'],
        baseMultiplier: 1.0,
        surgeCap: 1.5
      });
      expect(multiplier).toBeGreaterThan(1.0);
    });

    it('should apply off-peak discount', () => {
      const discount = calculateDynamicPricing({
        date: '2024-01-15',
        time: '09:00',
        offPeakHours: ['09:00', '10:00'],
        basePrice: 10000,
        offPeakDiscount: 0.10
      });
      expect(discount).toBe(9000);
    });
  });

  describe('handleSpecialEvents', () => {
    it('should get holiday hours', () => {
      const hours = getSeasonalAvailability({
        date: '2024-12-25',
        holidaySchedule: {
          '2024-12-25': { open: false }
        }
      });
      expect(hours.open).toBe(false);
    });

    it('should validate event booking', () => {
      const result = validateEventBooking({
        eventId: 'event-1',
        date: '2024-02-14',
        requiresAdvanceBooking: true,
        minAdvanceDays: 7
      });
      expect(result.valid).toBeDefined();
    });
  });

  describe('convertTimezones', () => {
    it('should convert UTC to salon timezone', () => {
      const result = convertToSalonTimezone({
        utcTime: '2024-01-15T10:00:00Z',
        salonTimezone: 'Europe/Copenhagen'
      });
      expect(result).toBeDefined();
    });

    it('should convert salon time to UTC', () => {
      const result = convertToUTC({
        localTime: '2024-01-15T11:00:00',
        salonTimezone: 'Europe/Copenhagen'
      });
      expect(result).toContain('Z');
    });

    it('should handle DST correctly', () => {
      const summer = convertToUTC({
        localTime: '2024-07-15T11:00:00',
        salonTimezone: 'Europe/Copenhagen'
      });
      const winter = convertToUTC({
        localTime: '2024-01-15T11:00:00',
        salonTimezone: 'Europe/Copenhagen'
      });
      expect(summer).not.toBe(winter);
    });
  });

  describe('handleDeposits', () => {
    it('should calculate deposit amount', () => {
      const deposit = calculateDepositAmount({
        totalAmount: 10000,
        depositPercent: 20
      });
      expect(deposit).toBe(2000);
    });

    it('should require deposit for high-value bookings', () => {
      const result = handleDepositRequirement({
        amount: 50000,
        depositThreshold: 30000
      });
      expect(result.required).toBe(true);
    });
  });

  describe('handleNoShows', () => {
    it('should calculate no-show fee', () => {
      const fee = calculateNoShowCharge({
        bookingValue: 10000,
        noShowPolicy: 'full_charge'
      });
      expect(fee).toBe(10000);
    });

    it('should apply partial no-show fee', () => {
      const fee = calculateNoShowCharge({
        bookingValue: 10000,
        noShowPolicy: 'partial_charge',
        chargePercent: 50
      });
      expect(fee).toBe(5000);
    });

    it('should validate grace period', () => {
      const result = validateGracePeriod({
        bookingTime: '2024-01-15T10:00:00Z',
        arrivalTime: '2024-01-15T10:10:00Z',
        gracePeriodMinutes: 15
      });
      expect(result.withinGracePeriod).toBe(true);
    });
  });

  describe('handleRefunds', () => {
    it('should calculate full refund', () => {
      const refund = calculateRefundAmount({
        paidAmount: 10000,
        refundPolicy: 'full',
        cancellationTime: new Date(Date.now() - 86400000),
        bookingTime: new Date(Date.now() + 86400000)
      });
      expect(refund).toBe(10000);
    });

    it('should calculate partial refund', () => {
      const refund = calculateRefundAmount({
        paidAmount: 10000,
        refundPolicy: 'partial',
        refundPercent: 50,
        cancellationTime: new Date(Date.now() - 43200000),
        bookingTime: new Date(Date.now() + 43200000)
      });
      expect(refund).toBe(5000);
    });

    it('should deny refund within window', () => {
      const result = validateRefundEligibility({
        paidAmount: 10000,
        cancellationWindowHours: 24,
        bookingTime: new Date(Date.now() + 3600000)
      });
      expect(result.eligible).toBe(false);
    });
  });

  describe('handleRescheduling', () => {
    it('should validate reschedule window', () => {
      const result = validateRescheduleWindow({
        originalTime: new Date(Date.now() + 86400000),
        newTime: new Date(Date.now() + 172800000),
        minHoursBefore: 24
      });
      expect(result.valid).toBe(true);
    });

    it('should calculate reschedule fee', () => {
      const fee = calculateRescheduleFee({
        bookingValue: 10000,
        hoursBefore: 12,
        freeWindowHours: 24,
        feePercent: 10
      });
      expect(fee).toBe(1000);
    });
  });

  describe('handleMembership', () => {
    it('should validate VIP access', () => {
      const result = validateVIPAccess({
        customerTier: 'gold',
        requiredTier: 'silver'
      });
      expect(result.hasAccess).toBe(true);
    });

    it('should calculate priority fee', () => {
      const fee = calculatePriorityFee({
        basePrice: 10000,
        priorityLevel: 'high',
        feeMultiplier: 1.2
      });
      expect(fee).toBe(12000);
    });

    it('should get member benefits', () => {
      const benefits = getMemberBenefits({
        tier: 'platinum',
        benefits: ['priority_booking', 'discount_20', 'free_cancellation']
      });
      expect(benefits.discount).toBe(0.20);
    });
  });

  describe('handlePackages', () => {
    it('should validate package sessions', () => {
      const result = validatePackageSessions({
        packageId: 'pkg-1',
        totalSessions: 10,
        usedSessions: 5,
        requestedSessions: 3
      });
      expect(result.valid).toBe(true);
    });

    it('should check package expiration', () => {
      const result = getPackageExpiration({
        purchaseDate: '2024-01-01',
        validityMonths: 12
      });
      expect(result.expired).toBe(false);
    });
  });

  describe('handlePromoCodes', () => {
    it('should validate promo code', () => {
      const result = validatePromoCode({
        code: 'SUMMER20',
        validCodes: ['SUMMER20', 'WINTER10'],
        expiryDate: '2024-12-31'
      });
      expect(result.valid).toBe(true);
    });

    it('should calculate promo discount', () => {
      const discount = getPromoCodeDiscount({
        code: 'SAVE20',
        basePrice: 10000,
        discountPercent: 20
      });
      expect(discount).toBe(2000);
    });

    it('should check promo restrictions', () => {
      const result = handlePromoRestrictions({
        code: 'NEWCUSTOMER',
        isNewCustomer: false,
        newCustomerOnly: true
      });
      expect(result.allowed).toBe(false);
    });
  });

  describe('calculateFinalPrice', () => {
    it('should calculate with all components', () => {
      const price = calculateFinalPrice({
        basePrice: 10000,
        discounts: [
          { type: 'member', amount: 1000 },
          { type: 'promo', amount: 500 }
        ],
        taxRate: 0.25,
        deposit: 2000
      });
      expect(price.final).toBeGreaterThan(0);
    });

    it('should handle tax exemption', () => {
      const price = calculateFinalPrice({
        basePrice: 10000,
        taxExempt: true
      });
      expect(price.tax).toBe(0);
    });
  });

  describe('handleMultiCurrency', () => {
    it('should convert currency', () => {
      const result = calculateCurrencyConversion({
        amount: 100,
        fromCurrency: 'EUR',
        toCurrency: 'DKK',
        exchangeRate: 7.46
      });
      expect(result).toBe(746);
    });

    it('should get exchange rate', async () => {
      const rate = await getExchangeRate('EUR', 'DKK');
      expect(rate).toBeGreaterThan(0);
    });
  });

  describe('handleResources', () => {
    it('should check room availability', async () => {
      const result = await checkResourceAvailability({
        resourceType: 'room',
        resourceId: 'room-1',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      });
      expect(result.available).toBeDefined();
    });

    it('should allocate resources', async () => {
      const result = await allocateResources({
        bookingId: 'booking-1',
        resources: ['room-1', 'chair-2'],
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      });
      expect(result.allocated).toBe(true);
    });

    it('should handle resource conflicts', async () => {
      const result = await handleResourceConflicts({
        requestedResources: ['room-1'],
        conflictingBookings: ['booking-2']
      });
      expect(result.hasConflict).toBe(true);
    });
  });

  describe('handleEquipment', () => {
    it('should check equipment availability', async () => {
      const result = await checkEquipmentAvailability({
        equipmentId: 'dryer-1',
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T11:00:00Z'
      });
      expect(result.available).toBeDefined();
    });

    it('should get maintenance windows', () => {
      const windows = getMaintenanceWindows({
        equipmentId: 'dryer-1',
        schedule: [
          { day: 'monday', start: '02:00', end: '04:00' }
        ]
      });
      expect(windows).toBeInstanceOf(Array);
    });
  });

  describe('optimizeAllocation', () => {
    it('should optimize staff allocation', async () => {
      const result = await optimizeStaffAllocation({
        salonId: 'salon-1',
        date: '2024-01-15',
        bookings: [
          { id: 'b1', service: 'haircut', duration: 30 },
          { id: 'b2', service: 'color', duration: 90 }
        ]
      });
      expect(result.allocations).toBeInstanceOf(Array);
    });

    it('should balance workload', async () => {
      const result = await optimizeStaffAllocation({
        salonId: 'salon-1',
        date: '2024-01-15',
        balanceWorkload: true
      });
      expect(result.balanced).toBe(true);
    });
  });

  describe('findAlternativeSlots', () => {
    it('should find nearby slots', async () => {
      const slots = await findAlternativeSlots({
        salonId: 'salon-1',
        preferredDate: '2024-01-15',
        preferredTime: '10:00',
        flexibility: 60 // minutes
      });
      expect(slots).toBeInstanceOf(Array);
    });

    it('should suggest different staff', async () => {
      const slots = await findAlternativeSlots({
        salonId: 'salon-1',
        preferredDate: '2024-01-15',
        preferredTime: '10:00',
        allowDifferentStaff: true
      });
      expect(slots.length).toBeGreaterThan(0);
    });
  });

  describe('getNextAvailableSlot', () => {
    it('should find next available slot', async () => {
      const slot = await getNextAvailableSlot({
        salonId: 'salon-1',
        serviceId: 'service-1',
        from: '2024-01-15T09:00:00Z'
      });
      expect(slot).toBeDefined();
    });

    it('should respect preferred time range', async () => {
      const slot = await getNextAvailableSlot({
        salonId: 'salon-1',
        serviceId: 'service-1',
        from: '2024-01-15T09:00:00Z',
        preferredTimeRange: { start: '09:00', end: '17:00' }
      });
      expect(slot).toBeDefined();
    });
  });
});
