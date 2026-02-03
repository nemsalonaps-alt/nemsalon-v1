import { httpError } from '../../../server/http-error.js';
import type { Booking, BookingStatus } from '../domain/content-domain.js';
import {
  createBooking as createBookingRepo,
  getBookingById,
  updateBookingStatus as updateBookingStatusRepo
} from '../repo/booking-repo.js';
import { createCustomer, getCustomerById } from '../repo/customer-repo.js';
import { getServiceById } from '../repo/service-repo.js';
import { getStaffById } from '../repo/staff-repo.js';

export type CreateBookingInput = {
  salonId: string;
  serviceId: string;
  staffId: string;
  startTime: string;
  endTime: string;
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
  async createBooking(input: CreateBookingInput): Promise<Booking> {
    const start = new Date(input.startTime);
    const end = new Date(input.endTime);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
      throw httpError(400, 'INVALID_TIME_FORMAT', 'startTime or endTime is invalid.');
    }
    if (start >= end) {
      throw httpError(400, 'INVALID_TIME_RANGE', 'endTime must be after startTime.');
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
      endTime: input.endTime,
      status: 'pending',
      notes: input.notes,
      totalAmount: service.priceAmount,
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
