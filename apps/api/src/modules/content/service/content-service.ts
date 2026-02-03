import { HttpError, httpError } from '../../../server/http-error.js';
import type {
  Booking,
  BookingStatus,
  BusinessHoursEntry,
  Salon,
  Service,
  StaffProfile
} from '../domain/content-domain.js';
import {
  createBooking as createBookingRepo,
  getBookingById,
  getBookingByIdempotencyKey,
  updateBookingStatus as updateBookingStatusRepo,
  updateBookingFields as updateBookingFieldsRepo,
  updateBookingSchedule as updateBookingScheduleRepo,
  cancelBooking as cancelBookingRepo
} from '../repo/booking-repo.js';
import { getSalonBusinessHours, replaceSalonBusinessHours } from '../repo/business-hours-repo.js';
import { createCustomer, getCustomerById, getCustomersByIds } from '../repo/customer-repo.js';
import { createSalon, getSalonById, updateSalonById } from '../repo/salon-repo.js';
import {
  createService,
  getServiceById,
  getServicesByIds,
  listServices as listServicesRepo,
  updateService as updateServiceRepo
} from '../repo/service-repo.js';
import { addStaffServices, getStaffServiceIds } from '../repo/staff-services-repo.js';
import {
  createStaffProfile,
  getStaffById,
  listStaffProfiles,
  updateStaffProfile
} from '../repo/staff-repo.js';
import { listBookings as listBookingsRepo } from '../repo/booking-repo.js';
import { listPaymentsForBookingIds } from '../../payments/repo/payments-repo.js';
import {
  createStaffTimeOff,
  deleteStaffTimeOff,
  listStaffTimeOffForSalon
} from '../repo/staff-time-off-repo.js';
import { notificationsService } from '../../notifications/service/notifications-service.js';

export type CreateBookingInput = {
  salonId: string;
  serviceId: string;
  staffId: string;
  startTime: string;
  endTime?: string;
  idempotencyKey?: string;
  notes?: string;
  customerId?: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
};

export const contentService = {
  async createSalon(input: {
    name: string;
    timezone: string;
    locale: string;
    currency: string;
  }): Promise<Salon> {
    return createSalon(input);
  },

  async updateSalon(
    salonId: string,
    input: { name?: string; timezone?: string; locale?: string; currency?: string }
  ): Promise<Salon> {
    const salon = await getSalonById(salonId);
    if (!salon) {
      throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found.');
    }
    return updateSalonById(salonId, input);
  },

  async setSalonBusinessHours(
    salonId: string,
    weekly: BusinessHoursEntry[]
  ): Promise<BusinessHoursEntry[]> {
    const salon = await getSalonById(salonId);
    if (!salon) {
      throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found.');
    }
    const saved = await replaceSalonBusinessHours(salonId, weekly);
    await updateSalonById(salonId, { status: 'active' });
    return saved;
  },

  async getSalonBusinessHours(salonId: string): Promise<BusinessHoursEntry[]> {
    const salon = await getSalonById(salonId);
    if (!salon) {
      throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found.');
    }
    return getSalonBusinessHours(salonId);
  },

  async createStaff(input: {
    salonId: string;
    name: string;
    role: StaffProfile['role'];
    active: boolean;
  }): Promise<StaffProfile> {
    const salon = await getSalonById(input.salonId);
    if (!salon) {
      throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found.');
    }
    return createStaffProfile({
      salonId: input.salonId,
      name: input.name,
      role: input.role,
      active: input.active
    });
  },

  async listStaff(salonId: string): Promise<StaffProfile[]> {
    return listStaffProfiles(salonId);
  },

  async updateStaff(input: {
    salonId: string;
    staffId: string;
    name?: string;
    role?: StaffProfile['role'];
    active?: boolean;
    email?: string | null;
    phone?: string | null;
  }): Promise<StaffProfile> {
    const staff = await updateStaffProfile(input);
    if (!staff) {
      throw httpError(404, 'STAFF_NOT_FOUND', 'error.staff_not_found');
    }
    return staff;
  },

  async createService(input: {
    salonId: string;
    name: string;
    durationMinutes: number;
    bufferMinutes?: number;
    price: number;
    currency: string;
    active: boolean;
  }): Promise<Service> {
    const salon = await getSalonById(input.salonId);
    if (!salon) {
      throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found.');
    }
    return createService({
      salonId: input.salonId,
      name: input.name,
      durationMinutes: input.durationMinutes,
      bufferMinutes: input.bufferMinutes,
      price: input.price,
      currency: input.currency,
      active: input.active
    });
  },

  async listServices(salonId: string): Promise<Service[]> {
    return listServicesRepo(salonId);
  },

  async updateService(input: {
    salonId: string;
    serviceId: string;
    name?: string;
    durationMinutes?: number;
    bufferMinutes?: number;
    price?: number;
    currency?: string;
    active?: boolean;
  }): Promise<Service> {
    const service = await updateServiceRepo(input);
    if (!service) {
      throw httpError(404, 'SERVICE_NOT_FOUND', 'error.service_not_found');
    }
    return service;
  },

  async assignStaffServices(input: {
    salonId: string;
    staffId: string;
    serviceIds: string[];
  }): Promise<{ staffId: string; serviceIds: string[] }> {
    const staff = await getStaffById(input.staffId);
    if (!staff) {
      throw httpError(404, 'STAFF_NOT_FOUND', 'Staff member not found.');
    }
    if (staff.salonId !== input.salonId) {
      throw httpError(403, 'STAFF_SALON_MISMATCH', 'Staff member does not belong to this salon.');
    }

    const services = await getServicesByIds(input.serviceIds);
    if (services.length !== input.serviceIds.length) {
      throw httpError(404, 'SERVICE_NOT_FOUND', 'One or more services were not found.');
    }
    const mismatched = services.find((service) => service.salonId !== input.salonId);
    if (mismatched) {
      throw httpError(403, 'SERVICE_SALON_MISMATCH', 'Service does not belong to this salon.');
    }

    const assigned = await addStaffServices(input.staffId, input.serviceIds);
    return { staffId: input.staffId, serviceIds: assigned };
  },

  async getStaffServices(input: { salonId: string; staffId: string }): Promise<string[]> {
    const staff = await getStaffById(input.staffId);
    if (!staff) {
      throw httpError(404, 'STAFF_NOT_FOUND', 'Staff member not found.');
    }
    if (staff.salonId !== input.salonId) {
      throw httpError(403, 'STAFF_SALON_MISMATCH', 'Staff member does not belong to this salon.');
    }
    return getStaffServiceIds(input.staffId);
  },

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    if (input.idempotencyKey) {
      const existing = await getBookingByIdempotencyKey(input.salonId, input.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const start = new Date(input.startTime);
    if (Number.isNaN(start.valueOf())) {
      throw httpError(400, 'BOOKING_INVALID_TIME', 'error.booking.invalid_time_range');
    }

    const service = await getServiceById(input.serviceId);
    if (!service) {
      throw httpError(404, 'BOOKING_INVALID_REFERENCE', 'error.booking.invalid_reference');
    }
    const staff = await getStaffById(input.staffId);
    if (!staff) {
      throw httpError(404, 'BOOKING_INVALID_REFERENCE', 'error.booking.invalid_reference');
    }

    if (service.salonId !== input.salonId || staff.salonId !== input.salonId) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'error.auth.forbidden');
    }

    const staffServiceIds = await getStaffServiceIds(input.staffId);
    if (!staffServiceIds.includes(input.serviceId)) {
      throw httpError(
        400,
        'BOOKING_STAFF_NOT_ASSIGNED',
        'error.booking.staff_not_assigned_to_service'
      );
    }

    const serviceDuration = service.durationMinutes + (service.bufferMinutes ?? 0);
    if (serviceDuration <= 0) {
      throw httpError(400, 'BOOKING_INVALID_TIME', 'error.booking.invalid_time_range');
    }
    const computedEnd = new Date(start.getTime() + serviceDuration * 60_000);
    if (computedEnd <= start) {
      throw httpError(400, 'BOOKING_INVALID_TIME', 'error.booking.invalid_time_range');
    }
    if (input.endTime) {
      const providedEnd = new Date(input.endTime);
      if (Number.isNaN(providedEnd.valueOf())) {
        throw httpError(400, 'BOOKING_INVALID_TIME', 'error.booking.invalid_time_range');
      }
      if (providedEnd.getTime() !== computedEnd.getTime()) {
        throw httpError(400, 'BOOKING_DURATION_MISMATCH', 'error.booking.duration_mismatch');
      }
    }

    const salon = await getSalonById(input.salonId);
    if (!salon) {
      throw httpError(404, 'SALON_NOT_FOUND', 'error.salon_not_found');
    }
    assertAlignedToInterval(start, 15, salon.timezone);
    const weekly = await getSalonBusinessHours(input.salonId);
    assertWithinBusinessHours(start, computedEnd, weekly, salon.timezone);

    let customerId = input.customerId;
    if (customerId) {
      const existingCustomer = await getCustomerById(customerId);
      if (!existingCustomer) {
        throw httpError(404, 'BOOKING_INVALID_REFERENCE', 'error.booking.invalid_reference');
      }
      if (existingCustomer.salonId !== input.salonId) {
        throw httpError(403, 'AUTH_FORBIDDEN', 'error.auth.forbidden');
      }
    } else if (input.customer) {
      const created = await createCustomer({
        salonId: input.salonId,
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        notes: input.customer.notes
      });
      customerId = created.id;
    } else {
      throw httpError(400, 'BOOKING_CUSTOMER_REQUIRED', 'error.booking.customer_required');
    }

    if (!customerId) {
      throw httpError(500, 'CUSTOMER_RESOLUTION_FAILED', 'Unable to resolve customer.');
    }

    try {
      return await createBookingRepo({
        salonId: input.salonId,
        customerId,
        staffId: input.staffId,
        serviceId: input.serviceId,
        startTime: input.startTime,
        endTime: computedEnd.toISOString(),
        status: 'pending',
        idempotencyKey: input.idempotencyKey,
        notes: input.notes,
        totalAmount: service.price,
        currency: service.currency
      });
    } catch (error) {
      if (
        error instanceof HttpError &&
        error.code === 'BOOKING_IDEMPOTENCY_CONFLICT' &&
        input.idempotencyKey
      ) {
        const existing = await getBookingByIdempotencyKey(input.salonId, input.idempotencyKey);
        if (existing) return existing;
      }
      throw error;
    }
  },

  async getBooking(bookingId: string): Promise<Booking> {
    const booking = await getBookingById(bookingId);
    if (!booking) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'error.booking.not_found');
    }
    return booking;
  },

  async listBookings(input: {
    salonId: string;
    fromUtc?: string;
    toUtc?: string;
    staffId?: string;
    status?: BookingStatus;
  }): Promise<
    Array<
      Booking & {
        customerName?: string | null;
        serviceName?: string | null;
        staffName?: string | null;
        paymentStatus?: string | null;
        paymentId?: string | null;
      }
    >
  > {
    const bookings = await listBookingsRepo({
      salonId: input.salonId,
      fromUtc: input.fromUtc,
      toUtc: input.toUtc,
      staffId: input.staffId,
      status: input.status
    });

    const customerIds = Array.from(new Set(bookings.map((b) => b.customerId)));
    const serviceIds = Array.from(new Set(bookings.map((b) => b.serviceId)));
    const staffIds = Array.from(new Set(bookings.map((b) => b.staffId)));

    const [customers, services, staff, payments] = await Promise.all([
      getCustomersByIds(customerIds),
      getServicesByIds(serviceIds),
      Promise.all(staffIds.map((id) => getStaffById(id))).then((rows) =>
        rows.filter(Boolean) as StaffProfile[]
      ),
      listPaymentsForBookingIds(bookings.map((b) => b.id))
    ]);

    const customersById = new Map(customers.map((c) => [c.id, c]));
    const servicesById = new Map(services.map((s) => [s.id, s]));
    const staffById = new Map(staff.map((s) => [s.id, s]));

    const paymentsByBooking = new Map<string, { status: string; id: string }>();
    for (const payment of payments) {
      if (!paymentsByBooking.has(payment.bookingId)) {
        paymentsByBooking.set(payment.bookingId, { status: payment.status, id: payment.id });
      }
    }

    return bookings.map((booking) => {
      const customer = customersById.get(booking.customerId);
      const service = servicesById.get(booking.serviceId);
      const staffMember = staffById.get(booking.staffId);
      const payment = paymentsByBooking.get(booking.id);
      return {
        ...booking,
        customerName: customer?.name ?? null,
        serviceName: service?.name ?? null,
        staffName: staffMember?.name ?? null,
        paymentStatus: payment?.status ?? null,
        paymentId: payment?.id ?? null
      };
    });
  },

  async updateBookingStatus(bookingId: string, status: BookingStatus): Promise<Booking> {
    const booking = await updateBookingStatusRepo(bookingId, status);
    if (!booking) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'error.booking.not_found');
    }
    return booking;
  },

  async updateBooking(bookingId: string, input: { status?: BookingStatus; notes?: string | null }) {
    const booking = await updateBookingFieldsRepo({
      bookingId,
      status: input.status,
      notes: input.notes
    });
    if (!booking) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'error.booking.not_found');
    }
    return booking;
  },

  async cancelBooking(input: {
    bookingId: string;
    reasonKey?: string;
    note?: string;
  }): Promise<Booking> {
    const booking = await getBookingById(input.bookingId);
    if (!booking) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'error.booking.not_found');
    }
    if (booking.status === 'cancelled') {
      return booking;
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw httpError(400, 'BOOKING_CANNOT_CANCEL', 'error.booking.cannot_cancel');
    }
    const updated = await cancelBookingRepo({
      bookingId: input.bookingId,
      reasonKey: input.reasonKey,
      note: input.note
    });
    if (!updated) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'error.booking.not_found');
    }
    const customer = updated.customerId ? await getCustomerById(updated.customerId) : null;
    if (customer) {
      await notificationsService.queueBookingCancelled({
        salonId: updated.salonId,
        bookingId: updated.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        startTime: updated.startTime,
        endTime: updated.endTime,
        reasonKey: input.reasonKey,
        note: input.note
      });
    }
    return updated;
  },

  async rescheduleBooking(input: {
    bookingId: string;
    staffId: string;
    startTime: string;
  }): Promise<Booking> {
    const booking = await getBookingById(input.bookingId);
    if (!booking) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'error.booking.not_found');
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw httpError(400, 'BOOKING_CANNOT_RESCHEDULE', 'error.booking.cannot_reschedule');
    }

    const service = await getServiceById(booking.serviceId);
    if (!service) {
      throw httpError(404, 'BOOKING_INVALID_REFERENCE', 'error.booking.invalid_reference');
    }

    const staff = await getStaffById(input.staffId);
    if (!staff) {
      throw httpError(404, 'BOOKING_INVALID_REFERENCE', 'error.booking.invalid_reference');
    }
    if (staff.salonId !== booking.salonId || service.salonId !== booking.salonId) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'error.auth.forbidden');
    }

    const staffServiceIds = await getStaffServiceIds(input.staffId);
    if (!staffServiceIds.includes(booking.serviceId)) {
      throw httpError(
        400,
        'BOOKING_STAFF_NOT_ASSIGNED',
        'error.booking.staff_not_assigned_to_service'
      );
    }

    const start = new Date(input.startTime);
    if (Number.isNaN(start.valueOf())) {
      throw httpError(400, 'BOOKING_INVALID_TIME', 'error.booking.invalid_time_range');
    }

    const serviceDuration = service.durationMinutes + (service.bufferMinutes ?? 0);
    if (serviceDuration <= 0) {
      throw httpError(400, 'BOOKING_INVALID_TIME', 'error.booking.invalid_time_range');
    }
    const computedEnd = new Date(start.getTime() + serviceDuration * 60_000);
    if (computedEnd <= start) {
      throw httpError(400, 'BOOKING_INVALID_TIME', 'error.booking.invalid_time_range');
    }

    const salon = await getSalonById(booking.salonId);
    if (!salon) {
      throw httpError(404, 'SALON_NOT_FOUND', 'error.salon_not_found');
    }
    assertAlignedToInterval(start, 15, salon.timezone);
    const weekly = await getSalonBusinessHours(booking.salonId);
    assertWithinBusinessHours(start, computedEnd, weekly, salon.timezone);

    const updated = await updateBookingScheduleRepo({
      bookingId: booking.id,
      staffId: input.staffId,
      startTime: start.toISOString(),
      endTime: computedEnd.toISOString()
    });
    if (!updated) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'error.booking.not_found');
    }
    return updated;
  },

  async listStaffTimeOff(input: { salonId: string; staffId?: string }) {
    return listStaffTimeOffForSalon(input);
  },

  async createStaffTimeOff(input: {
    salonId: string;
    staffId: string;
    startTime: string;
    endTime: string;
    reason?: string | null;
  }) {
    const staff = await getStaffById(input.staffId);
    if (!staff || staff.salonId !== input.salonId) {
      throw httpError(404, 'STAFF_NOT_FOUND', 'error.staff_not_found');
    }
    if (new Date(input.endTime) <= new Date(input.startTime)) {
      throw httpError(400, 'TIME_RANGE_INVALID', 'error.staff.time_off_invalid');
    }
    return createStaffTimeOff(input);
  },

  async deleteStaffTimeOff(input: { salonId: string; staffId: string; id: string }) {
    const deleted = await deleteStaffTimeOff(input);
    if (!deleted) {
      throw httpError(404, 'TIME_OFF_NOT_FOUND', 'error.staff.time_off_not_found');
    }
    return deleted;
  }
};

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type WeeklyEntry = {
  enabled: boolean;
  startMinutes: number;
  endMinutes: number;
};

function assertWithinBusinessHours(
  start: Date,
  end: Date,
  weekly: BusinessHoursEntry[],
  timeZone: string
) {
  if (!weekly.length) {
    throw httpError(400, 'BOOKING_OUTSIDE_BUSINESS_HOURS', 'error.booking.outside_business_hours');
  }

  const weeklyMap = buildWeeklyMap(weekly);
  const startParts = getLocalParts(start, timeZone);
  const endParts = getLocalParts(end, timeZone);
  if (
    startParts.year !== endParts.year ||
    startParts.month !== endParts.month ||
    startParts.day !== endParts.day
  ) {
    throw httpError(400, 'BOOKING_OUTSIDE_BUSINESS_HOURS', 'error.booking.outside_business_hours');
  }

  const weekday = getWeekdayId(start, timeZone);
  const entry = weeklyMap[weekday];
  if (!entry || !entry.enabled || entry.startMinutes >= entry.endMinutes) {
    throw httpError(400, 'BOOKING_OUTSIDE_BUSINESS_HOURS', 'error.booking.outside_business_hours');
  }

  const startMinutes = toMinutesOfDay(startParts);
  const endMinutes = toMinutesOfDay(endParts);
  if (startMinutes < entry.startMinutes || endMinutes > entry.endMinutes) {
    throw httpError(400, 'BOOKING_OUTSIDE_BUSINESS_HOURS', 'error.booking.outside_business_hours');
  }
}

function assertAlignedToInterval(date: Date, intervalMinutes: number, timeZone: string) {
  const parts = getLocalParts(date, timeZone);
  const minutes = toMinutesOfDay(parts);
  const isAligned = parts.second === 0 && Math.abs(minutes % intervalMinutes) < 0.001;
  if (!isAligned) {
    throw httpError(400, 'BOOKING_INVALID_TIME_ALIGNMENT', 'error.booking.invalid_time_alignment');
  }
}

function buildWeeklyMap(weekly: BusinessHoursEntry[]): Record<string, WeeklyEntry> {
  const map: Record<string, WeeklyEntry> = {};
  for (const entry of weekly) {
    const startMinutes = parseTime(entry.startTime);
    const endMinutes = parseTime(entry.endTime);
    if (startMinutes === null || endMinutes === null) {
      continue;
    }
    map[entry.day] = {
      enabled: entry.enabled,
      startMinutes,
      endMinutes
    };
  }
  return map;
}

function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }
  return hours * 60 + minutes + seconds / 60;
}

function getLocalParts(date: Date, timeZone: string): LocalParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second')
  };
}

function toMinutesOfDay(parts: LocalParts) {
  return parts.hour * 60 + parts.minute + parts.second / 60;
}

function getWeekdayId(date: Date, timeZone: string): BusinessHoursEntry['day'] {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });
  const short = formatter.format(date);
  return (
    {
      Mon: 'mon',
      Tue: 'tue',
      Wed: 'wed',
      Thu: 'thu',
      Fri: 'fri',
      Sat: 'sat',
      Sun: 'sun'
    }[short] ?? 'mon'
  );
}
