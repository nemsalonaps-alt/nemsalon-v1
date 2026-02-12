import { get, post } from '../../lib/api';

export type PublicSalon = {
  id: string;
  name: string;
  slug?: string | null;
  timezone: string;
  locale: string;
  currency: string;
  cancellationWindowMinutes: number;
  status?: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  durationMinutes: number;
  bufferMinutes?: number;
  price: number;
  currency: string;
  active?: boolean;
};

export type PublicStaff = {
  id: string;
  name: string;
  role: string;
  active: boolean;
};

export type PublicBooking = {
  id: string;
  salonId: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount: number;
  currency: string;
  customerName?: string | null;
  staffName?: string | null;
  serviceName?: string | null;
  paymentStatus?: string | null;
  paymentId?: string | null;
  salonName?: string | null;
  salonSlug?: string | null;
  salonLocale?: string | null;
  salonTimezone?: string | null;
  salonCancellationWindowMinutes?: number;
  salonPhone?: string | null;
  salonEmail?: string | null;
  salonAddressLine1?: string | null;
  salonAddressLine2?: string | null;
  salonCity?: string | null;
  salonPostalCode?: string | null;
  salonCountry?: string | null;
};

export type AvailabilitySlot = {
  startUtc: string;
  endUtc: string;
  staffId: string;
};

export type AvailabilityResponse = {
  slots: AvailabilitySlot[];
  meta: {
    fromUtc: string;
    days: number;
    intervalMinutes: number;
    serviceId: string;
    staffId?: string;
    timezone: string;
  };
};

export async function fetchPublicSalon(slug: string) {
  return get<PublicSalon>(`/v1/public/salons/${slug}`);
}

export async function listPublicServices(slug: string) {
  return get<{ data: PublicService[] }>(`/v1/public/salons/${slug}/services`);
}

export async function listPublicStaff(slug: string, serviceId?: string) {
  const query = serviceId ? `?serviceId=${encodeURIComponent(serviceId)}` : '';
  return get<{ data: PublicStaff[] }>(`/v1/public/salons/${slug}/staff${query}`);
}

export async function fetchPublicAvailability(input: {
  salonSlug: string;
  serviceId: string;
  staffId?: string;
  from?: string;
  days?: number;
  limit?: number;
  intervalMinutes?: number;
}) {
  const query = new URLSearchParams();
  query.set('salonSlug', input.salonSlug);
  query.set('serviceId', input.serviceId);
  if (input.staffId) query.set('staffId', input.staffId);
  if (input.from) query.set('from', input.from);
  if (input.days) query.set('days', String(input.days));
  if (input.limit) query.set('limit', String(input.limit));
  if (input.intervalMinutes) query.set('intervalMinutes', String(input.intervalMinutes));
  return get<AvailabilityResponse>(`/v1/public/availability?${query.toString()}`);
}

export async function createPublicBooking(input: {
  salonSlug: string;
  serviceId: string;
  staffId?: string;
  startUtc: string;
  notes?: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
}) {
  return post<{ booking: PublicBooking; bookingToken: string; expiresAt?: string | null }>(
    '/v1/public/bookings',
    input
  );
}

export async function fetchPublicBooking(bookingId: string, token: string) {
  const query = new URLSearchParams();
  query.set('token', token);
  return get<PublicBooking>(`/v1/public/bookings/${bookingId}?${query.toString()}`);
}

export async function createPublicCheckout(input: {
  bookingId: string;
  token: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return post<{ checkoutUrl: string; paymentId: string }>(
    `/v1/public/bookings/${input.bookingId}/checkout`,
    {
      token: input.token,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl
    }
  );
}

export async function cancelPublicBooking(input: {
  bookingId: string;
  token: string;
  reasonKey?: string;
  note?: string;
}) {
  return post<PublicBooking>(`/v1/public/bookings/${input.bookingId}/cancel`, {
    token: input.token,
    reasonKey: input.reasonKey,
    note: input.note
  });
}

export async function reschedulePublicBooking(input: {
  bookingId: string;
  token: string;
  staffId?: string;
  startUtc: string;
}) {
  return post<PublicBooking>(`/v1/public/bookings/${input.bookingId}/reschedule`, {
    token: input.token,
    staffId: input.staffId,
    startUtc: input.startUtc
  });
}
