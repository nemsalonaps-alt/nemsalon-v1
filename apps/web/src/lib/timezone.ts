export type DateKey = string;

type ParsedDateKey = { year: number; month: number; day: number };

function parseDateKey(value: DateKey): ParsedDateKey {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  return { year, month, day };
}

export function addDaysToDateKey(value: DateKey, delta: number): DateKey {
  const { year, month, day } = parseDateKey(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function getWeekdayIndex(value: DateKey): number {
  const { year, month, day } = parseDateKey(value);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function getWeekStartDateKey(value: DateKey): DateKey {
  const day = getWeekdayIndex(value); // 0 = Sunday
  const offset = (day + 6) % 7; // Monday start
  return addDaysToDateKey(value, -offset);
}

export function getMonthStartDateKey(value: DateKey): DateKey {
  const { year, month } = parseDateKey(value);
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function getMonthEndDateKey(value: DateKey): DateKey {
  const { year, month } = parseDateKey(value);
  const end = new Date(Date.UTC(year, month, 0));
  return end.toISOString().slice(0, 10);
}

export function dateKeyToUtcDate(value: DateKey, hour = 12): Date {
  const { year, month, day } = parseDateKey(value);
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
}

export function getDateKeyInTimeZone(value: Date | string, timeZone: string): DateKey {
  const date = typeof value === 'string' ? new Date(value) : value;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const month = parts.find((p) => p.type === 'month')?.value ?? '00';
  const day = parts.find((p) => p.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
}

export function formatDateKey(
  value: DateKey,
  timeZone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = dateKeyToUtcDate(value);
  return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date);
}

export function getMinutesInTimeZone(value: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(value);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

function getTimeZoneOffset(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '0');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '1');
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const second = Number(parts.find((p) => p.type === 'second')?.value ?? '0');
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return (asUtc - date.getTime()) / 60000;
}

export function toUtcDateInTimeZone(
  dateKey: DateKey,
  timeZone: string,
  time: { hours: number; minutes: number; seconds?: number; ms?: number } = { hours: 0, minutes: 0 },
): Date {
  const { year, month, day } = parseDateKey(dateKey);
  const utcDate = new Date(
    Date.UTC(year, month - 1, day, time.hours, time.minutes, time.seconds ?? 0, time.ms ?? 0),
  );
  const offsetMinutes = getTimeZoneOffset(utcDate, timeZone);
  return new Date(utcDate.getTime() - offsetMinutes * 60_000);
}

export function toUtcIsoInTimeZone(
  dateKey: DateKey,
  timeZone: string,
  time: { hours: number; minutes: number; seconds?: number; ms?: number } = { hours: 0, minutes: 0 },
): string {
  return toUtcDateInTimeZone(dateKey, timeZone, time).toISOString();
}

export function getTodayDateKey(timeZone: string): DateKey {
  return getDateKeyInTimeZone(new Date(), timeZone);
}
