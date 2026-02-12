// Pure utility functions - no runtime dependencies
// Note: format and time utilities are in separate modules (format.ts, time.ts)
// Note: validation utilities are in validation.ts (validateEmail, validatePhone, etc.)

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
