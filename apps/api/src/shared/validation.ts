export type ValidationError = {
  field: string;
  expected: string;
  received: string;
};

export function validateString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`Invalid ${field}: expected string, received ${typeof value}`);
  }
  return value;
}

export function validateOptionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new TypeError(`Invalid ${field}: expected string or null, received ${typeof value}`);
  }
  return value;
}

export function validateNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new TypeError(`Invalid ${field}: expected number, received ${typeof value}`);
  }
  return value;
}

export function validateBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`Invalid ${field}: expected boolean, received ${typeof value}`);
  }
  return value;
}

export function validateEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new TypeError(
      `Invalid ${field}: expected one of [${allowed.join(', ')}], received ${value}`
    );
  }
  return value as T;
}

export function validateDateString(value: unknown, field: string): string {
  const str = validateString(value, field);
  const date = new Date(str);
  if (Number.isNaN(date.valueOf())) {
    throw new TypeError(`Invalid ${field}: expected valid date string, received ${value}`);
  }
  return str;
}
