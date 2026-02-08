// Pure utility functions - no runtime dependencies

export function timeToMinutes(value: string): number {
  const parts = value.split(':');
  const h = parts[0] ? Number(parts[0]) : Number.NaN;
  const m = parts[1] ? Number(parts[1]) : Number.NaN;
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function addMinutes(time: string, minutes: number): string {
  if (!time) return '';
  const parts = time.split(':');
  const h = parts[0] ? Number(parts[0]) : Number.NaN;
  const m = parts[1] ? Number(parts[1]) : Number.NaN;
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = h * 60 + m + minutes;
  const nextH = Math.floor(total / 60) % 24;
  const nextM = total % 60;
  return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
}

export function parsePrice(value: string): number {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  if (!normalized) return Number.NaN;
  return Number(normalized);
}

export function toMinorUnits(value: string): number {
  const parsed = parsePrice(value);
  if (Number.isNaN(parsed)) return Number.NaN;
  return Math.round(parsed * 100);
}

export function formatPrice(minorUnits: number, currency: string): string {
  const amount = minorUnits / 100;
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, '');
}

export function buildUrl(base: string, path: string): string {
  if (!base) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${normalizeBaseUrl(base)}${normalized}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  // E.164 format check
  return /^\+[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ''));
}
