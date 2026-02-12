// Formatting utilities for dates, times, and currency
// Pure functions with no runtime dependencies

const DEFAULT_LOCALE = 'da-DK';
const DEFAULT_CURRENCY = 'DKK';

export interface FormatOptions {
  locale?: string;
  timeZone?: string;
}

/**
 * Format a date as a full date string
 * @example formatDate('2026-02-05T14:30:00Z') // "5. februar 2026"
 */
export function formatDate(
  value: string | Date,
  options: FormatOptions = {}
): string {
  const { locale = DEFAULT_LOCALE, timeZone } = options;
  const date = typeof value === 'string' ? new Date(value) : value;
  
  if (Number.isNaN(date.valueOf())) {
    return typeof value === 'string' ? value : 'Invalid date';
  }
  
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  });
}

/**
 * Format a date as a short date string
 * @example formatShortDate('2026-02-05T14:30:00Z') // "05. feb"
 */
export function formatShortDate(
  value: string | Date,
  options: FormatOptions = {}
): string {
  const { locale = DEFAULT_LOCALE, timeZone } = options;
  const date = typeof value === 'string' ? new Date(value) : value;
  
  if (Number.isNaN(date.valueOf())) {
    return typeof value === 'string' ? value : 'Invalid date';
  }
  
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    timeZone,
  });
}

/**
 * Format a date with day name
 * @example formatDateWithDay('2026-02-05T14:30:00Z') // "torsdag 5. februar"
 */
export function formatDateWithDay(
  value: string | Date,
  options: FormatOptions = {}
): string {
  const { locale = DEFAULT_LOCALE, timeZone } = options;
  const date = typeof value === 'string' ? new Date(value) : value;
  
  if (Number.isNaN(date.valueOf())) {
    return typeof value === 'string' ? value : 'Invalid date';
  }
  
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  });
}

/**
 * Format a time string
 * @example formatTime('2026-02-05T14:30:00Z') // "14:30"
 */
export function formatTime(
  value: string | Date,
  options: FormatOptions = {}
): string {
  const { locale = DEFAULT_LOCALE, timeZone } = options;
  const date = typeof value === 'string' ? new Date(value) : value;
  
  if (Number.isNaN(date.valueOf())) {
    return typeof value === 'string' ? value : 'Invalid time';
  }
  
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

/**
 * Format a date and time together
 * @example formatDateTime('2026-02-05T14:30:00Z') // "05. feb 14:30"
 */
export function formatDateTime(
  value: string | Date,
  options: FormatOptions = {}
): string {
  const { locale = DEFAULT_LOCALE, timeZone } = options;
  const date = typeof value === 'string' ? new Date(value) : value;
  
  if (Number.isNaN(date.valueOf())) {
    return typeof value === 'string' ? value : 'Invalid date';
  }
  
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

/**
 * Format price from minor units (cents) to currency string
 * @example formatPrice(10000, 'DKK') // "100,00 kr."
 * @example formatPrice(5000, 'EUR') // "50,00 €"
 */
export function formatPrice(
  minorUnits: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  const amount = minorUnits / 100;
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    // Fallback if currency is invalid
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Format price number only (without currency symbol)
 * @example formatPriceNumber(10000) // "100,00"
 */
export function formatPriceNumber(
  minorUnits: number,
  locale: string = DEFAULT_LOCALE
): string {
  const amount = minorUnits / 100;
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse a price string to minor units
 * @example parsePrice('100,00') // 10000
 * @example parsePrice('100.50') // 10050
 */
export function parsePrice(value: string): number {
  // Normalize: replace comma with dot, remove non-numeric except dots
  const normalized = value
    .replace(',', '.')
    .replace(/[^0-9.]/g, '');
  
  if (!normalized) return Number.NaN;
  
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return Number.NaN;
  
  return Math.round(parsed * 100);
}

/**
 * Convert major units to minor units
 * @example toMinorUnits(100.50) // 10050
 */
export function toMinorUnits(value: number): number {
  return Math.round(value * 100);
}

/**
 * Convert minor units to major units
 * @example toMajorUnits(10050) // 100.50
 */
export function toMajorUnits(value: number): number {
  return value / 100;
}

/**
 * Format duration in minutes to human readable string
 * @example formatDuration(90) // "1 time 30 min"
 * @example formatDuration(30) // "30 min"
 */
export function formatDuration(minutes: number, locale: string = DEFAULT_LOCALE): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return locale === 'da-DK' 
      ? `${hours} ${hours === 1 ? 'time' : 'timer'}`
      : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  
  return locale === 'da-DK'
    ? `${hours} ${hours === 1 ? 'time' : 'timer'} ${remainingMinutes} min`
    : `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} min`;
}

/**
 * Format phone number to E.164 format
 * @example formatPhoneE164('12345678', '+45') // "+4512345678"
 */
export function formatPhoneE164(phone: string, countryCode: string = '+45'): string {
  const cleaned = phone.replace(/\s/g, '').replace(/^\+/, '');
  return cleaned.startsWith(countryCode.replace('+', '')) 
    ? `+${cleaned}` 
    : `${countryCode}${cleaned}`;
}
