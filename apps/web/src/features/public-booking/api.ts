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
  return apiRequest<PublicSalon>(`/v1/public/salons/${slug}`);
}

export async function listPublicServices(slug: string) {
  return apiRequest<{ data: PublicService[] }>(`/v1/public/salons/${slug}/services`);
}

export async function listPublicStaff(slug: string, serviceId?: string) {
  const query = serviceId ? `?serviceId=${encodeURIComponent(serviceId)}` : '';
  return apiRequest<{ data: PublicStaff[] }>(`/v1/public/salons/${slug}/staff${query}`);
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
  return apiRequest<AvailabilityResponse>(`/v1/public/availability?${query.toString()}`);
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
  return apiRequest<{ booking: PublicBooking; bookingToken: string; expiresAt?: string | null }>(
    '/v1/public/bookings',
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  );
}

export async function fetchPublicBooking(bookingId: string, token: string) {
  const query = new URLSearchParams();
  query.set('token', token);
  return apiRequest<PublicBooking>(`/v1/public/bookings/${bookingId}?${query.toString()}`);
}

export async function createPublicCheckout(input: {
  bookingId: string;
  token: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return apiRequest<{ checkoutUrl: string; paymentId: string }>(
    `/v1/public/bookings/${input.bookingId}/checkout`,
    {
      method: 'POST',
      body: JSON.stringify({
        token: input.token,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl
      })
    }
  );
}

export async function cancelPublicBooking(input: {
  bookingId: string;
  token: string;
  reasonKey?: string;
  note?: string;
}) {
  return apiRequest<PublicBooking>(`/v1/public/bookings/${input.bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({
      token: input.token,
      reasonKey: input.reasonKey,
      note: input.note
    })
  });
}

export async function reschedulePublicBooking(input: {
  bookingId: string;
  token: string;
  staffId?: string;
  startUtc: string;
}) {
  return apiRequest<PublicBooking>(`/v1/public/bookings/${input.bookingId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify({
      token: input.token,
      staffId: input.staffId,
      startUtc: input.startUtc
    })
  });
}
