import { getAccessToken } from '../../lib/auth';
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
  DashboardData
} from './types';

const apiBase =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = await getAccessToken();
  if (token) {
    headers.authorization = `Bearer ${token}`;
    return headers;
  }

  if (import.meta.env.DEV && import.meta.env.VITE_DEV_USER_ID) {
    headers['x-user-id'] = import.meta.env.VITE_DEV_USER_ID;
    if (import.meta.env.VITE_DEV_USER_EMAIL) {
      headers['x-user-email'] = import.meta.env.VITE_DEV_USER_EMAIL;
    }
  }

  return headers;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...authHeaders,
        ...(options.headers ?? {})
      },
      credentials: 'include'
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let message = `Request failed (${response.status}).`;
      if (isJson) {
        try {
          const body = (await response.json()) as { message?: string; errorKey?: string };
          message = body?.message ?? body?.errorKey ?? message;
        } catch {
          // ignore parse errors
        }
      }
      return { ok: false, error: message, status: response.status };
    }

    if (response.status === 204) {
      return { ok: true, data: undefined as T };
    }

    if (!isJson) {
      const text = await response.text();
      return { ok: false, error: `Expected JSON. ${text.slice(0, 120)}`, status: response.status };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0
    };
  }
}

export async function fetchMe() {
  return apiRequest<AuthMeResponse>('/v1/auth/me');
}

export async function listPlatformSalons(input: {
  status?: string;
  query?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const params = new URLSearchParams();
  if (input.status) params.set('status', input.status);
  if (input.query) params.set('query', input.query);
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  if (input.offset !== undefined) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<{ data: PlatformSalon[] }>(`/v1/platform/salons${suffix}`);
}

export async function getPlatformSalon(salonId: string) {
  return apiRequest<PlatformSalon>(`/v1/platform/salons/${salonId}`);
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
  return apiRequest<{ data: PlatformPayment[] }>(
    `/v1/platform/salons/${input.salonId}/payments${suffix}`
  );
}

export async function listPlatformAudit(input: {
  salonId?: string;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const params = new URLSearchParams();
  if (input.salonId) params.set('salonId', input.salonId);
  if (input.actorUserId) params.set('actorUserId', input.actorUserId);
  if (input.entityType) params.set('entityType', input.entityType);
  if (input.entityId) params.set('entityId', input.entityId);
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  if (input.offset !== undefined) params.set('offset', String(input.offset));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<{ data: PlatformAuditEntry[] }>(`/v1/platform/audit${suffix}`);
}

export async function listStaff() {
  return apiRequest<{ data: StaffProfile[] }>('/v1/staff');
}

export async function getStaffMe() {
  return apiRequest<StaffProfile>('/v1/staff/me');
}

export async function createStaff(payload: {
  name: string;
  role: 'owner' | 'admin' | 'staff';
  active?: boolean;
}) {
  return apiRequest<StaffProfile>('/v1/staff', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateStaff(staffId: string, payload: Partial<StaffProfile>) {
  return apiRequest<StaffProfile>(`/v1/staff/${staffId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function inviteStaff(staffId: string, payload: { email: string; role?: 'staff' | 'admin' }) {
  return apiRequest<{
    staff: StaffProfile;
    userId: string;
    email: string;
    status: 'invited' | 'existing';
    actionLink?: string | null;
  }>(`/v1/staff/${staffId}/invite`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listServices() {
  return apiRequest<{ data: Service[] }>('/v1/services');
}

export async function createService(payload: {
  name: string;
  durationMinutes: number;
  bufferMinutes?: number;
  price: number;
  currency: string;
  active?: boolean;
}) {
  return apiRequest<Service>('/v1/services', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateService(serviceId: string, payload: Partial<Service>) {
  return apiRequest<Service>(`/v1/services/${serviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function listStaffServices(staffId: string) {
  return apiRequest<{ staffId: string; serviceIds: string[] }>(`/v1/staff/${staffId}/services`);
}

export async function assignStaffServices(staffId: string, serviceIds: string[]) {
  return apiRequest<{ staffId: string; serviceIds: string[] }>(`/v1/staff/${staffId}/services`, {
    method: 'POST',
    body: JSON.stringify({ serviceIds })
  });
}

export async function listBookings(params: {
  from?: string;
  to?: string;
  staffId?: string;
  status?: string;
}) {
  const query = new URLSearchParams();
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.staffId) query.set('staffId', params.staffId);
  if (params.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<{ data: BookingSummary[] }>(`/v1/bookings${suffix}`);
}

export async function createBooking(payload: {
  staffId: string;
  serviceId: string;
  startUtc: string;
  notes?: string;
  customerId?: string;
  customer?: { name: string; email?: string; phone?: string };
}) {
  return apiRequest<{ id: string }>(`/v1/bookings`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getBooking(bookingId: string) {
  return apiRequest<BookingSummary>(`/v1/bookings/${bookingId}`);
}

export async function cancelBooking(bookingId: string, payload?: { reasonKey?: string; note?: string }) {
  return apiRequest<{ booking: BookingSummary }>(`/v1/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {})
  });
}

export async function rescheduleBooking(bookingId: string, payload: { staffId: string; startUtc: string }) {
  return apiRequest<{ booking: BookingSummary }>(`/v1/bookings/${bookingId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateBookingStatus(bookingId: string, status: string) {
  return apiRequest<BookingSummary>(`/v1/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
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
  return apiRequest<AvailabilityResponse>(`/v1/availability/slots?${query.toString()}`);
}

export async function createBookingAccessToken(bookingId: string) {
  return apiRequest<{ bookingToken: string; expiresAt?: string | null }>(
    `/v1/bookings/${bookingId}/access-token`,
    {
      method: 'POST'
    }
  );
}

export async function createCheckout(input: {
  bookingId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return apiRequest<{ checkoutUrl: string; paymentId: string }>(`/v1/bookings/${input.bookingId}/checkout`, {
    method: 'POST',
    body: JSON.stringify({
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl
    })
  });
}

export async function getBusinessHours(salonId: string) {
  return apiRequest<{ weekly: BusinessHoursEntry[] }>(`/v1/salons/${salonId}/business-hours`);
}

export async function listCustomers(limit = 200) {
  const query = new URLSearchParams();
  query.set('limit', String(limit));
  return apiRequest<{ data: Customer[] }>(`/v1/customers?${query.toString()}`);
}

export async function createCustomer(payload: {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}) {
  return apiRequest<Customer>('/v1/customers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getCustomer(customerId: string) {
  return apiRequest<Customer>(`/v1/customers/${customerId}`);
}

export async function updateCustomer(customerId: string, payload: Partial<Customer>) {
  return apiRequest<Customer>(`/v1/customers/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function setBusinessHours(salonId: string, weekly: BusinessHoursEntry[]) {
  return apiRequest<{ weekly: BusinessHoursEntry[] }>(`/v1/salons/${salonId}/business-hours`, {
    method: 'PUT',
    body: JSON.stringify({ weekly })
  });
}

export async function listStaffTimeOff(staffId: string) {
  return apiRequest<{ data: StaffTimeOff[] }>(`/v1/staff/${staffId}/time-off`);
}

export async function getStaffWorkingHours(staffId: string) {
  return apiRequest<{ weekly: BusinessHoursEntry[] }>(`/v1/staff/${staffId}/working-hours`);
}

export async function setStaffWorkingHours(staffId: string, weekly: BusinessHoursEntry[]) {
  return apiRequest<{ weekly: BusinessHoursEntry[] }>(`/v1/staff/${staffId}/working-hours`, {
    method: 'PUT',
    body: JSON.stringify({ weekly })
  });
}

export async function createStaffTimeOff(staffId: string, payload: {
  startUtc: string;
  endUtc: string;
  reason?: string;
}) {
  return apiRequest<StaffTimeOff>(`/v1/staff/${staffId}/time-off`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deleteStaffTimeOff(staffId: string, timeOffId: string) {
  return apiRequest<void>(`/v1/staff/${staffId}/time-off/${timeOffId}`, {
    method: 'DELETE'
  });
}

export async function getPayment(paymentId: string) {
  return apiRequest<Payment>(`/v1/payments/${paymentId}`);
}

export async function refundPayment(paymentId: string, payload?: { idempotencyKey?: string; reason?: string }) {
  return apiRequest<{ payment: Payment; idempotent: boolean }>(`/v1/payments/${paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {})
  });
}

export async function reconcilePayment(paymentId: string) {
  return apiRequest<{ payment: Payment; action: 'noop' | 'updated' }>(
    `/v1/payments/${paymentId}/reconcile`,
    {
      method: 'POST'
    }
  );
}

export async function fetchDashboardData(date: string): Promise<ApiResult<DashboardData>> {
  // Build date range for today (00:00:00 to 23:59:59)
  const todayStart = new Date(`${date}T00:00:00.000Z`);
  const todayEnd = new Date(`${date}T23:59:59.999Z`);

  // Build date range for upcoming 7 days
  const upcomingStart = new Date(todayEnd);
  upcomingStart.setMilliseconds(upcomingStart.getMilliseconds() + 1);
  const upcomingEnd = new Date(upcomingStart);
  upcomingEnd.setDate(upcomingEnd.getDate() + 7);

  // Fetch both in parallel
  const [todayResult, upcomingResult] = await Promise.all([
    listBookings({
      from: todayStart.toISOString(),
      to: todayEnd.toISOString()
    }),
    listBookings({
      from: upcomingStart.toISOString(),
      to: upcomingEnd.toISOString()
    })
  ]);

  if (!todayResult.ok) {
    return { ok: false, error: todayResult.error, status: todayResult.status };
  }

  const todayBookings = todayResult.data.data;
  const upcomingBookings = upcomingResult.ok ? upcomingResult.data.data : [];

  // Calculate KPIs
  const completed = todayBookings.filter((b) => b.status === 'completed').length;
  const remaining = todayBookings.filter(
    (b) => !['completed', 'cancelled', 'no_show'].includes(b.status)
  ).length;

  const confirmedBookings = todayBookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'completed'
  );
  const confirmedAmount = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0);

  const sortedUpcoming = upcomingBookings.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  const nextBooking: BookingSummary | null = sortedUpcoming.length > 0 ? sortedUpcoming[0] ?? null : null;

  const alerts: DashboardData['kpis']['alerts'] = [];
  const pendingPayments = todayBookings.filter(
    (b) => b.paymentStatus === 'pending' || b.paymentStatus === 'failed'
  ).length;
  if (pendingPayments > 0) {
    alerts.push({
      type: 'payment',
      message: `${pendingPayments} booking${pendingPayments > 1 ? 'er' : ''} mangler betaling`,
      actionLink: '/calendar'
    });
  }

  const data: DashboardData = {
    todayBookings,
    kpis: {
      todayBookings: {
        total: todayBookings.length,
        completed,
        remaining
      },
      todayRevenue: {
        amount: todayBookings.reduce((sum, b) => sum + b.totalAmount, 0),
        currency: todayBookings[0]?.currency ?? 'DKK',
        confirmedAmount
      },
      upcoming: {
        total: upcomingBookings.length,
        nextBooking
      },
      systemStatus: alerts.length > 0 ? 'action-required' : 'healthy',
      alerts
    }
  };

  return { ok: true, data };
}
