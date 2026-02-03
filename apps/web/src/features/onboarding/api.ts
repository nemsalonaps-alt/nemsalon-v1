import { copy } from './copy';
import type { AuthMeResponse, WeeklyHours } from './types';

const apiBase =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

const isErrorKey = (value: string) => /^[a-z][a-z0-9_.-]*$/.test(value);

const formatApiError = (message: string) =>
  isErrorKey(message) ? copy.apiErrors[message] ?? copy.apiErrors.generic : message;

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
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
          const body = (await response.json()) as { message?: string };
          if (body?.message) message = formatApiError(body.message);
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

export async function updateSalon(salonId: string, payload: {
  name: string;
  timezone: string;
  locale: string;
  currency: string;
}) {
  return apiRequest(`/v1/salons/${salonId}`, {
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

export async function createBooking(payload: {
  salonId: string;
  staffId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
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
