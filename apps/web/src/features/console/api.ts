import { get, post, patch, put, del, type ApiResult } from '../../lib/api';
import type {
  AuthMeResponse,
  Customer,
  StaffProfile,
  Service,
  BookingSummary,
  AvailabilityResponse,
  BusinessHoursEntry,
  StaffTimeOff,
  Payment,
  PlatformSalon,
  PlatformAuditEntry,
  PlatformPayment,
  DashboardData,
  UsersListResponse,
  ImpersonationStatusResponse,
  ImpersonationUser,
} from './types';

export type StripeConnectStatus = {
  connected: boolean;
  stripeAccountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingCompletedAt: string | null;
};

export async function fetchMe() {
  return get<AuthMeResponse>('/v1/auth/me', { requireAuth: true });
}

export async function startStripeConnect() {
  return post<{ url: string; expiresAt: string }>(`/v1/payments/connect/start`, {
    requireAuth: true
  });
}

export async function getStripeConnectStatus() {
  return get<StripeConnectStatus>(`/v1/payments/connect/status`, { requireAuth: true });
}

export async function listPlatformSalons(
  input: {
    status?: string;
    query?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (input.status) params.set('status', input.status);
  if (input.query) params.set('query', input.query);
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  if (input.offset !== undefined) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return get<{ data: PlatformSalon[] }>(`/v1/platform/salons${suffix}`, { requireAuth: true });
}

export async function getPlatformSalon(salonId: string) {
  return get<PlatformSalon>(`/v1/platform/salons/${salonId}`, { requireAuth: true });
}

export async function listPlatformPayments(input: {
  salonId: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (input.status) params.set('status', input.status);
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  if (input.offset !== undefined) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return get<{ data: PlatformPayment[] }>(
    `/v1/platform/salons/${input.salonId}/payments${suffix}`,
    { requireAuth: true },
  );
}

export async function listPlatformAudit(
  input: {
    salonId?: string;
    actorUserId?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (input.salonId) params.set('salonId', input.salonId);
  if (input.actorUserId) params.set('actorUserId', input.actorUserId);
  if (input.entityType) params.set('entityType', input.entityType);
  if (input.entityId) params.set('entityId', input.entityId);
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  if (input.offset !== undefined) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return get<{ data: PlatformAuditEntry[] }>(`/v1/platform/audit${suffix}`, { requireAuth: true });
}

export async function listStaff() {
  return get<{ data: StaffProfile[] }>('/v1/staff', { requireAuth: true });
}

export async function getStaffMe() {
  return get<StaffProfile>('/v1/staff/me', { requireAuth: true });
}

export async function createStaff(payload: {
  name: string;
  role: 'owner' | 'admin' | 'staff';
  active?: boolean;
}) {
  return post<StaffProfile>('/v1/staff', payload, { requireAuth: true });
}

export async function updateStaff(staffId: string, payload: Partial<StaffProfile>) {
  return patch<StaffProfile>(`/v1/staff/${staffId}`, payload, { requireAuth: true });
}

export async function inviteStaff(
  staffId: string,
  payload: { email: string; role?: 'staff' | 'admin' },
) {
  return post<{
    staff: StaffProfile;
    userId: string;
    email: string;
    status: 'invited' | 'existing';
    actionLink?: string | null;
  }>(`/v1/staff/${staffId}/invite`, payload, { requireAuth: true });
}

export async function listServices() {
  return get<{ data: Service[] }>('/v1/services', { requireAuth: true });
}

export async function createService(payload: {
  name: string;
  durationMinutes: number;
  bufferMinutes?: number;
  price: number;
  currency: string;
  active?: boolean;
  salonId?: string;
}) {
  return post<Service>('/v1/services', payload, { requireAuth: true });
}

export async function updateService(serviceId: string, payload: Partial<Service>) {
  return patch<Service>(`/v1/services/${serviceId}`, payload, { requireAuth: true });
}

export async function listStaffServices(staffId: string) {
  return get<{ staffId: string; serviceIds: string[] }>(`/v1/staff/${staffId}/services`, {
    requireAuth: true,
  });
}

export async function assignStaffServices(staffId: string, serviceIds: string[]) {
  return post<{ staffId: string; serviceIds: string[] }>(
    `/v1/staff/${staffId}/services`,
    { serviceIds },
    { requireAuth: true },
  );
}

export async function listBookings(params: {
  from?: string;
  to?: string;
  staffId?: string;
  status?: string;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.staffId) query.set('staffId', params.staffId);
  if (params.status) query.set('status', params.status);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return get<{ data: BookingSummary[] }>(`/v1/bookings${suffix}`, { requireAuth: true });
}

export async function createBooking(payload: {
  staffId: string;
  serviceId: string;
  startUtc: string;
  notes?: string;
  customerId?: string;
  customer?: { name: string; email?: string; phone?: string };
}) {
  return post<{ id: string }>(`/v1/bookings`, payload, { requireAuth: true });
}

export async function getBooking(bookingId: string) {
  return get<BookingSummary>(`/v1/bookings/${bookingId}`, { requireAuth: true });
}

export async function cancelBooking(
  bookingId: string,
  payload?: { reasonKey?: string; note?: string },
) {
  return post<{ booking: BookingSummary }>(`/v1/bookings/${bookingId}/cancel`, payload ?? {}, {
    requireAuth: true,
  });
}

export async function rescheduleBooking(
  bookingId: string,
  payload: { staffId: string; startUtc: string },
) {
  return post<{ booking: BookingSummary }>(`/v1/bookings/${bookingId}/reschedule`, payload, {
    requireAuth: true,
  });
}

export async function updateBookingStatus(bookingId: string, status: string) {
  return patch<BookingSummary>(`/v1/bookings/${bookingId}`, { status }, { requireAuth: true });
}

export async function fetchAvailability(payload: {
  serviceId: string;
  staffId?: string;
  fromUtc?: string;
  days?: number;
  limit?: number;
  intervalMinutes?: number;
}) {
  const query = new URLSearchParams();
  query.set('serviceId', payload.serviceId);
  if (payload.staffId) query.set('staffId', payload.staffId);
  if (payload.fromUtc) query.set('from', payload.fromUtc);
  if (payload.days) query.set('days', String(payload.days));
  if (payload.limit) query.set('limit', String(payload.limit));
  if (payload.intervalMinutes) query.set('intervalMinutes', String(payload.intervalMinutes));
  return get<AvailabilityResponse>(`/v1/availability/slots?${query.toString()}`, {
    requireAuth: true,
  });
}

export async function createBookingAccessToken(bookingId: string) {
  return post<{ bookingToken: string; expiresAt?: string | null }>(
    `/v1/bookings/${bookingId}/access-token`,
    {},
    { requireAuth: true },
  );
}

export async function createCheckout(input: {
  bookingId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return post<{ checkoutUrl: string; paymentId: string }>(
    `/v1/bookings/${input.bookingId}/checkout`,
    { successUrl: input.successUrl, cancelUrl: input.cancelUrl },
    { requireAuth: true },
  );
}

export async function getBusinessHours(salonId: string) {
  return get<{ weekly: BusinessHoursEntry[] }>(`/v1/salons/${salonId}/business-hours`, {
    requireAuth: true,
  });
}

export async function listCustomers(limit = 200) {
  const query = new URLSearchParams();
  query.set('limit', String(limit));
  return get<{ data: Customer[] }>(`/v1/customers?${query.toString()}`, { requireAuth: true });
}

export async function createCustomer(payload: {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}) {
  return post<Customer>('/v1/customers', payload, { requireAuth: true });
}

export async function getCustomer(customerId: string) {
  return get<Customer>(`/v1/customers/${customerId}`, { requireAuth: true });
}

export async function updateCustomer(customerId: string, payload: Partial<Customer>) {
  return patch<Customer>(`/v1/customers/${customerId}`, payload, { requireAuth: true });
}

export async function setBusinessHours(salonId: string, weekly: BusinessHoursEntry[]) {
  return put<{ weekly: BusinessHoursEntry[] }>(
    `/v1/salons/${salonId}/business-hours`,
    { weekly },
    { requireAuth: true },
  );
}

export async function listStaffTimeOff(staffId: string) {
  return get<{ data: StaffTimeOff[] }>(`/v1/staff/${staffId}/time-off`, { requireAuth: true });
}

export async function getStaffWorkingHours(staffId: string) {
  return get<{ weekly: BusinessHoursEntry[] }>(`/v1/staff/${staffId}/working-hours`, {
    requireAuth: true,
  });
}

export async function setStaffWorkingHours(staffId: string, weekly: BusinessHoursEntry[]) {
  return put<{ weekly: BusinessHoursEntry[] }>(
    `/v1/staff/${staffId}/working-hours`,
    { weekly },
    { requireAuth: true },
  );
}

export async function createStaffTimeOff(
  staffId: string,
  payload: { startUtc: string; endUtc: string; reason?: string },
) {
  return post<StaffTimeOff>(`/v1/staff/${staffId}/time-off`, payload, { requireAuth: true });
}

export async function deleteStaffTimeOff(staffId: string, timeOffId: string) {
  return del<void>(`/v1/staff/${staffId}/time-off/${timeOffId}`, { requireAuth: true });
}

export async function getPayment(paymentId: string) {
  return get<Payment>(`/v1/payments/${paymentId}`, { requireAuth: true });
}

export async function refundPayment(
  paymentId: string,
  payload?: { idempotencyKey?: string; reason?: string },
) {
  return post<{ payment: Payment; idempotent: boolean }>(
    `/v1/payments/${paymentId}/refund`,
    payload ?? {},
    { requireAuth: true },
  );
}

export async function reconcilePayment(paymentId: string) {
  return post<{ payment: Payment; action: 'noop' | 'updated' }>(
    `/v1/payments/${paymentId}/reconcile`,
    {},
    { requireAuth: true },
  );
}

export async function fetchDashboardData(date: string): Promise<ApiResult<DashboardData>> {
  const todayStart = new Date(`${date}T00:00:00.000`);
  const todayEnd = new Date(`${date}T23:59:59.999`);
  const upcomingStart = new Date(todayEnd);
  upcomingStart.setMilliseconds(upcomingStart.getMilliseconds() + 1);
  const upcomingEnd = new Date(upcomingStart);
  upcomingEnd.setDate(upcomingEnd.getDate() + 7);

  const [todayResult, upcomingResult] = await Promise.all([
    listBookings({ from: todayStart.toISOString(), to: todayEnd.toISOString() }),
    listBookings({ from: upcomingStart.toISOString(), to: upcomingEnd.toISOString() }),
  ]);

  if (!todayResult.ok) {
    return { ok: false, error: todayResult.error, status: todayResult.status };
  }

  const todayBookings = todayResult.data.data;
  const upcomingBookings = upcomingResult.ok ? upcomingResult.data.data : [];

  const completed = todayBookings.filter((b: BookingSummary) => b.status === 'completed').length;
  const remaining = todayBookings.filter(
    (b: BookingSummary) => !['completed', 'cancelled', 'no_show'].includes(b.status),
  ).length;
  const confirmedBookings = todayBookings.filter(
    (b: BookingSummary) => b.status === 'confirmed' || b.status === 'completed',
  );
  const confirmedAmount = confirmedBookings.reduce(
    (sum: number, b: BookingSummary) => sum + b.totalAmount,
    0,
  );
  const sortedUpcoming = upcomingBookings.sort(
    (a: BookingSummary, b: BookingSummary) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  const nextBooking: BookingSummary | null =
    sortedUpcoming.length > 0 ? (sortedUpcoming[0] ?? null) : null;

  const alerts: DashboardData['kpis']['alerts'] = [];
  const pendingPayments = todayBookings.filter(
    (b: BookingSummary) => b.paymentStatus === 'pending' || b.paymentStatus === 'failed',
  ).length;
  if (pendingPayments > 0) {
    alerts.push({
      type: 'payment',
      message: `__PENDING_PAYMENTS__:${pendingPayments}`,
      actionLink: '/calendar',
    });
  }

  return {
    ok: true,
    data: {
      todayBookings,
      kpis: {
        todayBookings: { total: todayBookings.length, completed, remaining },
        todayRevenue: {
          amount: todayBookings.reduce((sum: number, b: BookingSummary) => sum + b.totalAmount, 0),
          currency: todayBookings[0]?.currency ?? 'DKK',
          confirmedAmount,
        },
        upcoming: { total: upcomingBookings.length, nextBooking },
        systemStatus: alerts.length > 0 ? 'action-required' : 'healthy',
        alerts,
      },
    },
  };
}

export async function listPlatformUsers(
  input: {
    role?: 'owner' | 'staff' | 'customer';
    query?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (input.role) params.set('role', input.role);
  if (input.query) params.set('query', input.query);
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  if (input.offset !== undefined) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return get<UsersListResponse>(`/v1/platform/users${suffix}`, { requireAuth: true });
}

export async function startImpersonation(userId: string) {
  return post<{ success: boolean; user?: ImpersonationUser }>(
    `/v1/platform/impersonate/${userId}`,
    {},
    { requireAuth: true },
  );
}

export async function stopImpersonation() {
  return post<{ success: boolean }>('/v1/platform/stop-impersonation', {}, { requireAuth: true });
}

export async function getImpersonationStatus() {
  return get<ImpersonationStatusResponse>('/v1/platform/impersonation/status', {
    requireAuth: true,
  });
}
