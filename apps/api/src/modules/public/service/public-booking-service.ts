import { randomBytes, createHash } from 'crypto';
import { httpError } from '../../../server/http-error.js';
import type { Booking } from '../../bookings/domain/bookings-domain.js';
import type { Salon } from '../../salons/domain/salons-domain.js';
import type { Service } from '../../services/domain/services-domain.js';
import type { StaffProfile } from '../../staff/domain/staff-domain.js';
import { availabilityService } from '../../availability/service/availability-service.js';
import { getCustomerById, findCustomerByContact } from '../../customers/repo/customers-repo.js';
import { getSalonBySlug, getSalonById } from '../../salons/repo/salons-repo.js';
import { getServiceById, listServices } from '../../services/repo/services-repo.js';
import { getStaffById, listStaffProfiles } from '../../staff/repo/staff-repo.js';
import { getStaffIdsForService } from '../../staff/repo/staff-services-repo.js';
import { paymentsService } from '../../payments/service/payments-service.js';
import { createEvent } from '../../events/repo/events-repo.js';
import { contentService } from '../../content/service/content-service.js';
import {
  createBookingToken,
  getBookingTokenByHash,
  touchBookingToken
} from '../repo/booking-token-repo.js';

const TOKEN_TTL_DAYS = 30;
const DEFAULT_INTERVAL = 15;

export type PublicSalon = Pick<Salon, 'id' | 'name' | 'slug' | 'timezone' | 'locale' | 'currency' | 'cancellationWindowMinutes' | 'status' | 'phone' | 'email' | 'addressLine1' | 'addressLine2' | 'city' | 'postalCode' | 'country'>;

export type PublicService = Pick<Service, 'id' | 'name' | 'durationMinutes' | 'bufferMinutes' | 'price' | 'currency' | 'active'>;

export type PublicStaff = Pick<StaffProfile, 'id' | 'name' | 'role' | 'active'>;

export type PublicBookingSummary = Booking & {
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceName?: string | null;
  staffName?: string | null;
  salonName?: string | null;
  salonSlug?: string | null;
  salonLocale?: string | null;
  salonTimezone?: string | null;
  salonCancellationWindowMinutes?: number;
  paymentStatus?: string | null;
  paymentId?: string | null;
  salonPhone?: string | null;
  salonEmail?: string | null;
  salonAddressLine1?: string | null;
  salonAddressLine2?: string | null;
  salonCity?: string | null;
  salonPostalCode?: string | null;
  salonCountry?: string | null;
};

export const publicBookingService = {
  async getSalonBySlug(slug: string): Promise<PublicSalon> {
    const salon = await getSalonBySlug(slug);
    if (!salon) {
      throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found.');
    }
    if (salon.status !== 'active') {
      throw httpError(404, 'SALON_NOT_ACTIVE', 'Salon is not available.');
    }
    return {
      id: salon.id,
      name: salon.name,
      slug: salon.slug ?? null,
      timezone: salon.timezone,
      locale: salon.locale,
      currency: salon.currency,
      cancellationWindowMinutes: salon.cancellationWindowMinutes,
      status: salon.status,
      phone: salon.phone ?? null,
      email: salon.email ?? null,
      addressLine1: salon.addressLine1 ?? null,
      addressLine2: salon.addressLine2 ?? null,
      city: salon.city ?? null,
      postalCode: salon.postalCode ?? null,
      country: salon.country ?? null
    };
  },

  async listServices(slug: string): Promise<PublicService[]> {
    const salon = await this.getSalonBySlug(slug);
    const services = await listServices(salon.id);
    return services.filter((service) => service.active !== false);
  },

  async listStaff(slug: string, serviceId?: string): Promise<PublicStaff[]> {
    const salon = await this.getSalonBySlug(slug);
    let staff = await listStaffProfiles(salon.id);
    staff = staff.filter((entry) => entry.active !== false);
    if (serviceId) {
      const ids = await getStaffIdsForService(serviceId, salon.id);
      staff = staff.filter((entry) => ids.includes(entry.id));
    }
    return staff.map((entry) => ({
      id: entry.id,
      name: entry.name,
      role: entry.role,
      active: entry.active
    }));
  },

  async listAvailability(input: {
    salonSlug: string;
    serviceId: string;
    staffId?: string;
    fromUtc?: string;
    days?: number;
    limit?: number;
    intervalMinutes?: number;
  }) {
    const salon = await this.getSalonBySlug(input.salonSlug);
    const service = await getServiceById(input.serviceId);
    if (!service || service.salonId !== salon.id) {
      throw httpError(404, 'SERVICE_NOT_FOUND', 'Service not found.');
    }
    if (service.active === false) {
      throw httpError(400, 'SERVICE_INACTIVE', 'Service is not available.');
    }
    if (input.staffId) {
      const staff = await getStaffById(input.staffId);
      if (!staff || staff.salonId !== salon.id) {
        throw httpError(404, 'STAFF_NOT_FOUND', 'Staff not found.');
      }
    }
    const result = await availabilityService.getSlots({
      salonId: salon.id,
      serviceId: input.serviceId,
      staffId: input.staffId,
      fromUtc: input.fromUtc,
      days: input.days,
      limit: input.limit,
      intervalMinutes: input.intervalMinutes
    });
    await createEvent({
      eventKey: 'availability.public_viewed',
      salonId: salon.id,
      userId: null,
      metadata: {
        serviceId: input.serviceId,
        staffId: input.staffId ?? null,
        from: input.fromUtc ?? null,
        days: input.days ?? null,
        intervalMinutes: input.intervalMinutes ?? null
      }
    });
    return result;
  },

  async createPublicBooking(input: {
    salonSlug: string;
    serviceId: string;
    staffId?: string;
    startUtc: string;
    notes?: string;
    idempotencyKey?: string;
    customer: {
      name: string;
      email?: string;
      phone?: string;
    };
  }): Promise<{ booking: PublicBookingSummary; bookingToken: string; expiresAt: string | null }> {
    const salon = await this.getSalonBySlug(input.salonSlug);
    const service = await getServiceById(input.serviceId);
    if (!service || service.salonId !== salon.id) {
      throw httpError(404, 'SERVICE_NOT_FOUND', 'Service not found.');
    }
    if (service.active === false) {
      throw httpError(400, 'SERVICE_INACTIVE', 'Service is not available.');
    }
    const resolvedStaffId = await ensureSlotAvailable({
      salonId: salon.id,
      serviceId: input.serviceId,
      staffId: input.staffId,
      startUtc: input.startUtc
    });

    const existingCustomer = await findCustomerByContact({
      salonId: salon.id,
      email: input.customer.email,
      phone: input.customer.phone
    });

    const booking = await contentService.createBooking({
      salonId: salon.id,
      serviceId: input.serviceId,
      staffId: resolvedStaffId,
      startTime: input.startUtc,
      idempotencyKey: input.idempotencyKey,
      notes: input.notes,
      customerId: existingCustomer?.id,
      customer: existingCustomer
        ? undefined
        : {
            name: input.customer.name,
            email: input.customer.email,
            phone: input.customer.phone
          }
    });

    const { token, hash, expiresAt } = buildToken();
    await createBookingToken({ bookingId: booking.id, tokenHash: hash, expiresAt });

    await createEvent({
      eventKey: 'booking.public_created',
      salonId: salon.id,
      userId: null,
      metadata: {
        bookingId: booking.id,
        serviceId: input.serviceId,
        staffId: resolvedStaffId
      }
    });

    const summary = await hydratePublicBooking(booking, salon);

    return { booking: summary, bookingToken: token, expiresAt };
  },

  async createAccessTokenForBooking(input: { bookingId: string }) {
    const booking = await contentService.getBooking(input.bookingId);
    const { token, hash, expiresAt } = buildToken();
    await createBookingToken({ bookingId: booking.id, tokenHash: hash, expiresAt });
    return { bookingToken: token, expiresAt };
  },

  async getPublicBooking(input: { bookingId: string; token: string }): Promise<PublicBookingSummary> {
    const { booking, salon } = await resolveBookingByToken(input.bookingId, input.token);
    return hydratePublicBooking(booking, salon);
  },

  async createPublicCheckout(input: {
    bookingId: string;
    token: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const { booking, salon } = await resolveBookingByToken(input.bookingId, input.token);
    if (booking.status !== 'pending') {
      throw httpError(409, 'BOOKING_NOT_PENDING', 'Booking is not in a payable state.');
    }
    const idempotencyKey = `public:${booking.id}:${hashToken(input.token).slice(0, 12)}`;
    const result = await paymentsService.createCheckoutForBooking({
      bookingId: booking.id,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      salonId: salon.id,
      idempotencyKey
    });
    await createEvent({
      eventKey: 'checkout.public_started',
      salonId: salon.id,
      userId: null,
      metadata: { bookingId: booking.id }
    });
    return result;
  },

  async cancelPublicBooking(input: {
    bookingId: string;
    token: string;
    reasonKey?: string;
    note?: string;
  }): Promise<PublicBookingSummary> {
    const { booking, salon } = await resolveBookingByToken(input.bookingId, input.token);
    if (booking.status !== 'cancelled') {
      enforceCancellationWindow(booking, salon);
    }
    const cancelled = await contentService.cancelBooking({
      bookingId: booking.id,
      reasonKey: input.reasonKey,
      note: input.note
    });
    await createEvent({
      eventKey: 'booking.public_cancelled',
      salonId: salon.id,
      userId: null,
      metadata: { bookingId: booking.id }
    });
    return hydratePublicBooking(cancelled, salon);
  },

  async reschedulePublicBooking(input: {
    bookingId: string;
    token: string;
    staffId?: string;
    startUtc: string;
  }): Promise<PublicBookingSummary> {
    const { booking, salon } = await resolveBookingByToken(input.bookingId, input.token);
    enforceCancellationWindow(booking, salon);
    const resolvedStaffId = await ensureSlotAvailable({
      salonId: salon.id,
      serviceId: booking.serviceId,
      staffId: input.staffId ?? booking.staffId,
      startUtc: input.startUtc
    });
    const rescheduled = await contentService.rescheduleBooking({
      bookingId: booking.id,
      staffId: resolvedStaffId,
      startTime: input.startUtc
    });
    await createEvent({
      eventKey: 'booking.public_rescheduled',
      salonId: salon.id,
      userId: null,
      metadata: { bookingId: booking.id, staffId: resolvedStaffId }
    });
    return hydratePublicBooking(rescheduled, salon);
  }
};

function buildToken() {
  const token = randomBytes(32).toString('base64url');
  const hash = hashToken(token);
  const expiresAt = TOKEN_TTL_DAYS > 0 ? new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString() : null;
  return { token, hash, expiresAt };
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function resolveBookingByToken(bookingId: string, token: string) {
  const hash = hashToken(token);
  const tokenRecord = await getBookingTokenByHash(hash);
  if (!tokenRecord) {
    throw httpError(401, 'BOOKING_TOKEN_INVALID', 'Invalid booking token.');
  }
  if (tokenRecord.revokedAt) {
    throw httpError(403, 'BOOKING_TOKEN_REVOKED', 'Booking token is no longer valid.');
  }
  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
    throw httpError(403, 'BOOKING_TOKEN_EXPIRED', 'Booking token expired.');
  }
  if (tokenRecord.bookingId !== bookingId) {
    throw httpError(403, 'BOOKING_TOKEN_MISMATCH', 'Booking token does not match booking.');
  }
  const booking = await contentService.getBooking(bookingId);
  const salon = await getSalonById(booking.salonId);
  if (!salon) {
    throw httpError(404, 'SALON_NOT_FOUND', 'Salon not found.');
  }
  await touchBookingToken(tokenRecord.id);
  return { booking, salon };
}

async function hydratePublicBooking(booking: Booking, salon: Salon): Promise<PublicBookingSummary> {
  const [service, staff, customer] = await Promise.all([
    getServiceById(booking.serviceId),
    getStaffById(booking.staffId),
    getCustomerById(booking.customerId)
  ]);
  return {
    ...booking,
    customerName: customer?.name ?? null,
    customerEmail: customer?.email ?? null,
    customerPhone: customer?.phone ?? null,
    serviceName: service?.name ?? null,
    staffName: staff?.name ?? null,
    salonName: salon.name,
    salonSlug: salon.slug ?? null,
    salonLocale: salon.locale ?? 'da-DK',
    salonTimezone: salon.timezone ?? 'Europe/Copenhagen',
    salonCancellationWindowMinutes: salon.cancellationWindowMinutes ?? 0,
    paymentStatus: (booking as PublicBookingSummary).paymentStatus ?? null,
    paymentId: (booking as PublicBookingSummary).paymentId ?? null,
    salonPhone: salon.phone ?? null,
    salonEmail: salon.email ?? null,
    salonAddressLine1: salon.addressLine1 ?? null,
    salonAddressLine2: salon.addressLine2 ?? null,
    salonCity: salon.city ?? null,
    salonPostalCode: salon.postalCode ?? null,
    salonCountry: salon.country ?? null
  };
}

async function ensureSlotAvailable(input: {
  salonId: string;
  serviceId: string;
  staffId?: string;
  startUtc: string;
}) {
  const slots = await availabilityService.getSlots({
    salonId: input.salonId,
    serviceId: input.serviceId,
    staffId: input.staffId,
    fromUtc: input.startUtc,
    days: 1,
    limit: 50,
    intervalMinutes: DEFAULT_INTERVAL
  });
  const match = slots.slots.find((slot) => slot.startUtc === input.startUtc);
  if (!match) {
    throw httpError(409, 'BOOKING_TIME_NOT_AVAILABLE', 'error.booking.time_not_available');
  }
  return match.staffId;
}

function enforceCancellationWindow(booking: Booking, salon: Salon) {
  const windowMinutes = salon.cancellationWindowMinutes ?? 0;
  if (!windowMinutes || windowMinutes <= 0) return;
  const start = new Date(booking.startTime);
  const deadline = new Date(start.getTime() - windowMinutes * 60 * 1000);
  if (Date.now() > deadline.getTime()) {
    throw httpError(409, 'BOOKING_CANCEL_WINDOW_PASSED', 'error.booking.cancellation_window');
  }
}
