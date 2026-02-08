import { getCopy } from './copy';
import type { AuthMeResponse, WeeklyHours, AvailabilityResponse } from './types';
import { getAccessToken } from '../../lib/auth';

const apiBase =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

const isErrorKey = (value: string) => /^[a-z][a-z0-9_.-]*$/.test(value);

const formatApiError = (message: string) => {
  const copy = getCopy();
  if (!isErrorKey(message)) return message;
  const errorMessage = (copy.apiErrors as Record<string, string>)[message];
  return errorMessage ?? copy.apiErrors.generic;
};

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
    const copy = getCopy();
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
      let message = copy.errors.requestFailed(response.status);
      if (isJson) {
        try {
          const body = (await response.json()) as {
            message?: string;
            errorKey?: string;
            code?: string;
          };
          const key = body?.message ?? body?.errorKey ?? (body?.code ? `error.${body.code.toLowerCase()}` : undefined);
          if (key) message = formatApiError(key);
        } catch {
          // ignore parse errors
        }
      } else {
        try {
          const text = await response.text();
          if (text) message = `Request failed (${response.status}). Non-JSON response: ${text.slice(0, 120)}`;
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
      return {
        ok: false,
        error: `Expected JSON but got "${contentType || 'unknown'}". ${text.slice(0, 120)}`,
        status: response.status
      };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Network error: ${error.message}`
          : 'Network error: request failed.',
      status: 0
    };
  }
}

export async function fetchMe() {
  return apiRequest<AuthMeResponse>('/v1/auth/me');
}

export async function trackEvent(eventKey: string, metadata?: Record<string, unknown>) {
  return apiRequest<{ ok: true }>('/v1/events', {
    method: 'POST',
    body: JSON.stringify({
      eventKey,
      metadata
    })
  });
}

export async function updateSalon(salonId: string, payload: {
  name: string;
  timezone: string;
  locale: string;
  salonType?: string;
  currency: string;
}) {
  return apiRequest<{ slug?: string }>(`/v1/salons/${salonId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function setBusinessHours(salonId: string, weekly: WeeklyHours[]) {
  return apiRequest<{ weekly: WeeklyHours[] }>(`/v1/salons/${salonId}/business-hours`, {
    method: 'PUT',
    body: JSON.stringify({
      weekly: weekly.map((entry) => ({
        day: entry.day,
        startTime: entry.start,
        endTime: entry.end,
        enabled: entry.enabled
      }))
    })
  });
}

export async function createStaff(payload: { name: string; role: 'owner' | 'admin' | 'staff' }) {
  return apiRequest<{ id: string }>(`/v1/staff`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function createService(payload: {
  name: string;
  durationMinutes: number;
  bufferMinutes?: number;
  price: number;
  currency: string;
}) {
  return apiRequest<{ id: string }>(`/v1/services`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function assignStaffServices(staffId: string, serviceIds: string[]) {
  return apiRequest<{ staffId: string; serviceIds: string[] }>(`/v1/staff/${staffId}/services`, {
    method: 'POST',
    body: JSON.stringify({ serviceIds })
  });
}

export async function inviteStaff(payload: {
  email: string;
  name: string;
  role: 'staff' | 'admin';
}) {
  return apiRequest<{
    success: true;
    staffId: string;
    inviteToken: string;
  }>('/v1/auth/staff/invite', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function setStaffWorkingHours(staffId: string, weekly: WeeklyHours[]) {
  return apiRequest<{ weekly: WeeklyHours[] }>(`/v1/staff/${staffId}/working-hours`, {
    method: 'PUT',
    body: JSON.stringify({
      weekly: weekly.map((entry) => ({
        day: entry.day,
        startTime: entry.start,
        endTime: entry.end,
        enabled: entry.enabled
      }))
    })
  });
}

export async function createBooking(payload: {
  staffId: string;
  serviceId: string;
  startUtc: string;
  notes?: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
}) {
  return apiRequest<{ id: string }>(`/v1/bookings`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
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

export async function cancelBooking(bookingId: string, payload?: { reasonKey?: string; note?: string }) {
  return apiRequest<{ booking: { id: string; status: string } }>(`/v1/bookings/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {})
  });
}

export async function rescheduleBooking(bookingId: string, payload: { staffId: string; startUtc: string }) {
  return apiRequest<{ booking: { id: string; status: string } }>(`/v1/bookings/${bookingId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function activateSalon(salonId: string) {
  return apiRequest<{ id: string; status: 'active' }>(`/v1/salons/${salonId}/activate`, {
    method: 'POST'
  });
}

export async function fetchAvailabilitySlots(params: {
  serviceId: string;
  staffId?: string;
  from?: string;
  days?: number;
  limit?: number;
  intervalMinutes?: number;
}) {
  const query = new URLSearchParams();
  query.set('serviceId', params.serviceId);
  if (params.staffId) query.set('staffId', params.staffId);
  if (params.from) query.set('from', params.from);
  if (params.days) query.set('days', String(params.days));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.intervalMinutes) query.set('intervalMinutes', String(params.intervalMinutes));

  return apiRequest<AvailabilityResponse>(`/v1/availability/slots?${query.toString()}`);
}
