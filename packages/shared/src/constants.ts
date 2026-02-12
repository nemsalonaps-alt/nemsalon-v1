// Cross-cutting constants - pure values, no runtime dependencies

export const RoleOptions = ['owner', 'admin', 'staff'] as const;
export type Role = (typeof RoleOptions)[number];

export const BufferOptions = [0, 5, 10, 15] as const;
export type BufferMinutes = (typeof BufferOptions)[number];

export const WeekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type WeekDay = (typeof WeekDays)[number];

export const BookingStatuses = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type BookingStatus = (typeof BookingStatuses)[number];

export const PaymentStatuses = ['pending', 'paid', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PaymentStatuses)[number];

export const SalonTypes = [
  'hair_salon',
  'nail_salon',
  'wellness_center',
  'massage_clinic',
  'tattoo_studio',
  'barbershop',
  'spa_wellness',
  'cosmetic_clinic',
] as const;
export type SalonType = (typeof SalonTypes)[number];

export const CurrencyCodes = ['DKK', 'EUR', 'USD', 'GBP', 'NOK', 'SEK'] as const;
export type CurrencyCode = (typeof CurrencyCodes)[number];

export const DefaultBusinessHours = [
  { day: 'mon' as const, enabled: true, start: '09:00', end: '17:00' },
  { day: 'tue' as const, enabled: true, start: '09:00', end: '17:00' },
  { day: 'wed' as const, enabled: true, start: '09:00', end: '17:00' },
  { day: 'thu' as const, enabled: true, start: '09:00', end: '17:00' },
  { day: 'fri' as const, enabled: true, start: '09:00', end: '17:00' },
  { day: 'sat' as const, enabled: false, start: '09:00', end: '17:00' },
  { day: 'sun' as const, enabled: false, start: '09:00', end: '17:00' },
];

export const DefaultCurrencyForLocale: Record<string, CurrencyCode> = {
  da: 'DKK',
  en: 'EUR',
};

export const PaginationDefaults = {
  page: 1,
  limit: 50,
  maxLimit: 200,
} as const;

export const TimeConstraints = {
  minBookingMinutes: 5,
  maxBookingMinutes: 480,
  timeSlotInterval: 15,
} as const;
