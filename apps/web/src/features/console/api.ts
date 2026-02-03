import { getAccessToken } from '../../lib/auth';
import type {
  AuthMeResponse,
  StaffProfile,
  Service,
  BookingSummary,
  AvailabilityResponse,
  BusinessHoursEntry,
  StaffTimeOff,
  Payment
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

export async function listStaff() {
  return apiRequest<{ data: StaffProfile[] }>('/v1/staff');
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
  customer: { name: string; email?: string; phone?: string };
}) {
  return apiRequest<{ id: string }>(`/v1/bookings`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
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

export async function createCheckout(bookingId: string) {
  return apiRequest<{ checkoutUrl: string; paymentId: string }>(`/v1/bookings/${bookingId}/checkout`, {
    method: 'POST',
    body: JSON.stringify({
      provider: 'stripe',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    })
  });
}

export async function getBusinessHours(salonId: string) {
  return apiRequest<{ weekly: BusinessHoursEntry[] }>(`/v1/salons/${salonId}/business-hours`);
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
