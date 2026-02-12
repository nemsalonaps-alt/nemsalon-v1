// Validation utilities
// Pure functions with no runtime dependencies

/**
 * Validate email address format
 * @example validateEmail('test@example.com') // true
 * @example validateEmail('invalid') // false
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // RFC 5322 compliant regex (simplified but covers most cases)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

/**
 * Validate phone number (E.164 format)
 * @example validatePhone('+4512345678') // true
 * @example validatePhone('+1 234 567 8901') // true
 * @example validatePhone('12345678') // false (missing country code)
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove spaces and check E.164 format
  const cleaned = phone.replace(/\s/g, '');
  return /^\+[1-9]\d{1,14}$/.test(cleaned);
}

/**
 * Validate that a value is not empty
 * Checks for empty string, null, undefined, or whitespace-only strings
 * @example validateRequired('hello') // true
 * @example validateRequired('') // false
 * @example validateRequired('   ') // false
 * @example validateRequired(null) // false
 */
export function validateRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

/**
 * Validate minimum length of a string
 * @example validateMinLength('hello', 3) // true
 * @example validateMinLength('hi', 3) // false
 */
export function validateMinLength(value: string, min: number): boolean {
  if (typeof value !== 'string') return false;
  return value.length >= min;
}

/**
 * Validate maximum length of a string
 * @example validateMaxLength('hello', 10) // true
 * @example validateMaxLength('hello', 3) // false
 */
export function validateMaxLength(value: string, max: number): boolean {
  if (typeof value !== 'string') return false;
  return value.length <= max;
}

/**
 * Validate string length within range
 * @example validateLength('hello', 3, 10) // true
 * @example validateLength('hi', 3, 10) // false
 * @example validateLength('hello world', 3, 10) // false
 */
export function validateLength(value: string, min: number, max: number): boolean {
  if (typeof value !== 'string') return false;
  const len = value.length;
  return len >= min && len <= max;
}

/**
 * Validate URL format
 * @example validateUrl('https://example.com') // true
 * @example validateUrl('ftp://files.example.com') // true
 * @example validateUrl('not-a-url') // false
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'ftp:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate UUID format (v4 or v5)
 * @example validateUuid('550e8400-e29b-41d4-a716-446655440000') // true
 * @example validateUuid('not-a-uuid') // false
 */
export function validateUuid(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate Danish CPR number format (not checksum)
 * @example validateCpr('123456-1234') // true
 * @example validateCpr('1234561234') // true
 * @example validateCpr('12345') // false
 */
export function validateCpr(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // Remove dash and check 10 digits
  const cleaned = value.replace(/-/g, '');
  return /^\d{10}$/.test(cleaned);
}

/**
 * Validate that a number is within a range
 * @example validateRange(50, 0, 100) // true
 * @example validateRange(150, 0, 100) // false
 */
export function validateRange(value: number, min: number, max: number): boolean {
  if (typeof value !== 'number' || Number.isNaN(value)) return false;
  return value >= min && value <= max;
}

/**
 * Validate that a value is one of the allowed options
 * @example validateEnum('active', ['active', 'inactive']) // true
 * @example validateEnum('unknown', ['active', 'inactive']) // false
 */
export function validateEnum<T extends string>(
  value: string,
  allowed: readonly T[]
): value is T {
  if (typeof value !== 'string') return false;
  return allowed.includes(value as T);
}

/**
 * Validate date string format (ISO 8601)
 * @example validateDate('2026-02-05') // true
 * @example validateDate('2026-02-05T14:30:00Z') // true
 * @example validateDate('invalid') // false
 */
export function validateDate(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const date = new Date(value);
  return !Number.isNaN(date.valueOf());
}

/**
 * Validate time string format (HH:MM or HH:MM:SS)
 * @example validateTime('14:30') // true
 * @example validateTime('14:30:00') // true
 * @example validateTime('25:00') // false
 */
export function validateTime(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const parts = value.split(':');
  if (parts.length < 2 || parts.length > 3) return false;
  
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;
  
  if (parts[2]) {
    const s = Number(parts[2]);
    if (Number.isNaN(s) || s < 0 || s > 59) return false;
  }
  
  return true;
}

/**
 * Validate that a string matches a regex pattern
 * @example validatePattern('abc123', /^[a-z]+\d+$/) // true
 */
export function validatePattern(value: string, pattern: RegExp): boolean {
  if (typeof value !== 'string') return false;
  return pattern.test(value);
}

/**
 * Validate password strength (min 8 chars, at least 1 letter and 1 number)
 * @example validatePassword('Password123') // true
 * @example validatePassword('pass') // false
 */
export function validatePassword(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (value.length < 8) return false;
  if (!/[a-zA-Z]/.test(value)) return false;
  if (!/\d/.test(value)) return false;
  return true;
}

/**
 * Run multiple validations and return all errors
 * @example 
 * const errors = validateAll([
 *   { field: 'email', value: 'test@', validator: validateEmail },
 *   { field: 'name', value: '', validator: validateRequired },
 * ])
 * // returns [{ field: 'email', valid: false }, { field: 'name', valid: false }]
 */
export function validateAll(
  validations: Array<{ field: string; value: unknown; validator: (value: unknown) => boolean }>
): Array<{ field: string; valid: boolean }> {
  return validations.map(({ field, value, validator }) => ({
    field,
    valid: validator(value),
  }));
}

/**
 * Check if all validations pass
 * @example validateAllPass([{ field: 'email', value: 'test@', validator: validateEmail }]) // false
 */
export function validateAllPass(
  validations: Array<{ field: string; value: unknown; validator: (value: unknown) => boolean }>
): boolean {
  return validateAll(validations).every((r) => r.valid);
}
