const apiBase =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

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
      let message = `Request failed (${response.status}).`;
      if (isJson) {
        try {
          const body = (await response.json()) as { message?: string };
          if (body?.message) message = body.message;
        } catch {
          // ignore
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
      error: error instanceof Error ? error.message : 'Network error',
      status: 0
    };
  }
}

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
  createdAt: string;
};

export async function getCustomerProfile() {
  return apiRequest<CustomerProfile>('/v1/portal/me');
}

export async function updateCustomerProfile(input: { name?: string; phone?: string }) {
  return apiRequest<CustomerProfile>('/v1/portal/me', {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function listMyBookings(params?: { status?: 'upcoming' | 'past' | 'cancelled' | 'all'; limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  const queryString = query.toString();
  return apiRequest<{ data: CustomerBooking[]; meta: { total: number; offset: number; limit: number; status: string } }>(
    `/v1/portal/bookings${queryString ? `?${queryString}` : ''}`
  );
}

export async function getMyBooking(bookingId: string) {
  return apiRequest<CustomerBooking & { servicePrice?: number; salonTimezone?: string; cancellationReason?: string | null; cancellationNote?: string | null }>(`/v1/portal/bookings/${bookingId}`);
}

// Auth API
export async function registerCustomer(input: { email: string; password: string; name: string; phone?: string }) {
  return apiRequest<{ success: boolean; customerId: string; message: string }>('/v1/auth/customer/register', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function loginCustomer(input: { email: string; password: string }) {
  return apiRequest<{ success: boolean; customerId: string; email: string }>('/v1/auth/customer/login', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function logoutCustomer() {
  return apiRequest<{ success: boolean }>('/v1/auth/customer/logout', {
    method: 'POST'
  });
}

export async function getCustomerSession() {
  return apiRequest<{ success: boolean; customerId: string; email: string }>('/v1/auth/customer/session');
}
