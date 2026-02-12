function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, '');
}

export function getPublicBaseUrl() {
  const envUrl =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL
      ? String(import.meta.env.VITE_PUBLIC_APP_URL)
      : '';
  if (envUrl) return normalizeBaseUrl(envUrl);
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeBaseUrl(window.location.origin);
  }
  return '';
}

export function buildPublicUrl(path: string) {
  const base = getPublicBaseUrl();
  if (!base) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function buildBookingConfirmationUrl(input: {
  salonSlug: string;
  bookingId: string;
  token?: string | null;
}) {
  const path = `/book/${input.salonSlug}/confirmation/${input.bookingId}`;
  if (input.token) {
    return buildPublicUrl(`${path}?token=${encodeURIComponent(input.token)}`);
  }
  return buildPublicUrl(path);
}

export function buildBookingManageUrl(input: {
  salonSlug: string;
  bookingId: string;
  token?: string | null;
}) {
  const path = `/book/${input.salonSlug}/manage/${input.bookingId}`;
  if (input.token) {
    return buildPublicUrl(`${path}?token=${encodeURIComponent(input.token)}`);
  }
  return buildPublicUrl(path);
}

export function getSalonSlugFromPath(path: string): string | null {
  const match = path.match(/^\/book\/([^/]+)/);
  return match?.[1] ?? null;
}

export function getSalonSlugFromHostname(hostname: string): string | null {
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0] ?? null;
  }
  return null;
}
