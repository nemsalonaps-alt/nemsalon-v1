import { httpError } from '../../../server/http-error.js';
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
  updateBookingStatus as updateBookingStatusRepo
} from '../repo/booking-repo.js';
import { getSalonBusinessHours, replaceSalonBusinessHours } from '../repo/business-hours-repo.js';
import { createCustomer, getCustomerById } from '../repo/customer-repo.js';
import { createSalon, getSalonById, updateSalonById } from '../repo/salon-repo.js';
import { createService, getServiceById, getServicesByIds } from '../repo/service-repo.js';
import { addStaffServices, getStaffServiceIds } from '../repo/staff-services-repo.js';
import { createStaffProfile, getStaffById } from '../repo/staff-repo.js';

export type CreateBookingInput = {
  salonId: string;
  serviceId: string;
  staffId: string;
  startTime: string;
  endTime?: string;
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
    const start = new Date(input.startTime);
    if (Number.isNaN(start.valueOf())) {
      throw httpError(400, 'INVALID_TIME_FORMAT', 'startTime is invalid.');
    }

    const service = await getServiceById(input.serviceId);
    if (!service) {
      throw httpError(404, 'SERVICE_NOT_FOUND', 'Service not found.');
    }
    if (service.salonId !== input.salonId) {
      throw httpError(400, 'SERVICE_SALON_MISMATCH', 'Service does not belong to this salon.');
    }

    const staff = await getStaffById(input.staffId);
    if (!staff) {
      throw httpError(404, 'STAFF_NOT_FOUND', 'Staff member not found.');
    }
    if (staff.salonId !== input.salonId) {
      throw httpError(400, 'STAFF_SALON_MISMATCH', 'Staff member does not belong to this salon.');
    }

    const staffServiceIds = await getStaffServiceIds(input.staffId);
    if (!staffServiceIds.includes(input.serviceId)) {
      throw httpError(400, 'STAFF_SERVICE_MISMATCH', 'Staff member cannot perform this service.');
    }

    const serviceDuration = service.durationMinutes + (service.bufferMinutes ?? 0);
    const computedEnd = new Date(start.getTime() + serviceDuration * 60_000);
    if (input.endTime) {
      const providedEnd = new Date(input.endTime);
      if (Number.isNaN(providedEnd.valueOf())) {
        throw httpError(400, 'INVALID_TIME_FORMAT', 'endTime is invalid.');
      }
      const diff = Math.abs(providedEnd.getTime() - computedEnd.getTime());
      if (diff > 60_000) {
        throw httpError(400, 'END_TIME_MISMATCH', 'endTime must match service duration.');
      }
    }

    let customerId = input.customerId;
    if (customerId) {
      const existingCustomer = await getCustomerById(customerId);
      if (!existingCustomer) {
        throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
      }
      if (existingCustomer.salonId !== input.salonId) {
        throw httpError(400, 'CUSTOMER_SALON_MISMATCH', 'Customer does not belong to this salon.');
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
      throw httpError(400, 'CUSTOMER_REQUIRED', 'Provide customerId or customer details.');
    }

    if (!customerId) {
      throw httpError(500, 'CUSTOMER_RESOLUTION_FAILED', 'Unable to resolve customer.');
    }

    return createBookingRepo({
      salonId: input.salonId,
      customerId,
      staffId: input.staffId,
      serviceId: input.serviceId,
      startTime: input.startTime,
      endTime: computedEnd.toISOString(),
      status: 'pending',
      notes: input.notes,
      totalAmount: service.price,
      currency: service.currency
    });
  },

  async getBooking(bookingId: string): Promise<Booking> {
    const booking = await getBookingById(bookingId);
    if (!booking) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
    }
    return booking;
  },

  async updateBookingStatus(bookingId: string, status: BookingStatus): Promise<Booking> {
    const booking = await updateBookingStatusRepo(bookingId, status);
    if (!booking) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
    }
    return booking;
  }
};
