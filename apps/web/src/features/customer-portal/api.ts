import { get, patch, post } from '../../lib/api';

export type CustomerProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

export type CustomerBooking = {
  id: string;
  salonId: string;
  salonName: string;
  salonSlug: string | null;
  salonPhone: string | null;
  salonEmail: string | null;
  salonAddress: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  };
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  staffId: string;
  staffName: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string | null;
  totalAmount: number;
  currency: string;
  notes: string | null;
  manageUrl?: string | null;
  createdAt: string;
};

export async function getCustomerProfile() {
  return get<CustomerProfile>('/v1/portal/me', { requireAuth: true });
}

export async function updateCustomerProfile(input: { name?: string; phone?: string }) {
  return patch<CustomerProfile>('/v1/portal/me', input, { requireAuth: true });
}

export async function listMyBookings(params?: {
  status?: 'upcoming' | 'past' | 'cancelled' | 'all';
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  const queryString = query.toString();
  return get<{
    data: CustomerBooking[];
    meta: { total: number; offset: number; limit: number; status: string };
  }>(`/v1/portal/bookings${queryString ? `?${queryString}` : ''}`, { requireAuth: true });
}

export async function getMyBooking(bookingId: string) {
  return get<
    CustomerBooking & {
      servicePrice?: number;
      salonTimezone?: string;
      cancellationReason?: string | null;
      cancellationNote?: string | null;
    }
  >(`/v1/portal/bookings/${bookingId}`, { requireAuth: true });
}

export async function cancelMyBooking(bookingId: string) {
  return post<{ booking: CustomerBooking }>(
    `/v1/portal/bookings/${bookingId}/cancel`,
    {},
    { requireAuth: true },
  );
}

export async function rescheduleMyBooking(input: {
  bookingId: string;
  startUtc: string;
  staffId?: string;
}) {
  return post<{ booking: CustomerBooking }>(
    `/v1/portal/bookings/${input.bookingId}/reschedule`,
    { startUtc: input.startUtc, staffId: input.staffId },
    { requireAuth: true },
  );
}

export async function listPublicAvailability(input: {
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
  return get<{
    slots: Array<{ startUtc: string; endUtc: string; staffId: string }>;
    meta: { timezone: string };
  }>(`/v1/public/availability?${query.toString()}`);
}

// Receipts API
export type Receipt = {
  id: string;
  bookingId: string;
  salonName: string;
  serviceName: string;
  amount: number;
  currency: string;
  vatAmount: number;
  vatRate: number;
  paymentMethod: 'card' | 'mobilepay' | 'cash' | 'giftcard';
  paymentStatus: 'succeeded' | 'pending' | 'failed';
  paidAt: string | null;
  receiptNumber: string;
  pdfUrl: string | null;
  createdAt: string;
};

export async function listMyReceipts() {
  return get<Receipt[]>('/v1/portal/receipts', { requireAuth: true });
}

export async function downloadReceiptPdf(receiptId: string) {
  return get<{ pdfUrl: string }>(`/v1/portal/receipts/${receiptId}/pdf`, {
    requireAuth: true,
  });
}

// Notification Settings API
export type NotificationSettings = {
  smsEnabled: boolean;
  emailEnabled: boolean;
  reminder24h: boolean;
  reminder1h: boolean;
  marketingEmail: boolean;
  marketingSms: boolean;
  dataProcessing: boolean;
};

export type NotificationHistory = {
  id: string;
  type: 'sms' | 'email';
  purpose: 'confirmation' | 'reminder' | 'cancellation' | 'update';
  sentAt: string;
  status: 'sent' | 'failed' | 'delivered';
};

export async function getNotificationSettings() {
  return get<NotificationSettings>('/v1/portal/notifications/settings', { requireAuth: true });
}

export async function updateNotificationSettings(settings: NotificationSettings) {
  return patch<NotificationSettings>('/v1/portal/notifications/settings', settings, {
    requireAuth: true,
  });
}

export async function listNotificationHistory() {
  return get<NotificationHistory[]>('/v1/portal/notifications/history', { requireAuth: true });
}

// Favorites API
export type FavoriteSalon = {
  id: string;
  salonId: string;
  salonName: string;
  salonSlug: string;
  address: {
    line1: string;
    city: string;
    postalCode: string;
  };
  phone: string | null;
  logoUrl: string | null;
  addedAt: string;
};

export async function listMyFavorites() {
  return get<FavoriteSalon[]>('/v1/portal/favorites', { requireAuth: true });
}

export async function addFavorite(salonId: string) {
  return post<FavoriteSalon>('/v1/portal/favorites', { salonId }, { requireAuth: true });
}

export async function removeFavorite(salonId: string) {
  return post<void>(`/v1/portal/favorites/${salonId}/remove`, {}, { requireAuth: true });
}
