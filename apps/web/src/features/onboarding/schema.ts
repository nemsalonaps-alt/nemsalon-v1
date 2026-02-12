import { getCopy, resolveLocale } from './copy';
import type { BookingForm, SalonForm, ServiceForm, StaffForm, WeeklyHours } from './types';
import {
  timeToMinutes,
  addMinutes,
  parsePrice,
  toMinorUnits,
} from '@nemsalon/shared';
import { RoleOptions, BufferOptions, DefaultBusinessHours, DefaultCurrencyForLocale } from '@nemsalon/shared';

export const getDayLabels = (locale?: string) => getCopy(locale).dayLabels;

// Re-export constants from shared package
export { RoleOptions as roleOptions, BufferOptions as bufferOptions, DefaultBusinessHours as defaultWeeklyHours };

export const getBrowserTimezone = () =>
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : getCopy().salon.fields.timezonePlaceholder;

export const getBrowserLocale = () =>
  typeof navigator !== 'undefined' ? navigator.language : 'en';

export const normalizeLocale = (locale: string) => resolveLocale(locale);

export const defaultCurrencyForLocale = (locale: string) => DefaultCurrencyForLocale[locale] ?? 'EUR';

// Re-export utilities from shared package
export { timeToMinutes, addMinutes, parsePrice, toMinorUnits };

export const validateWeeklyHours = (hours: WeeklyHours[], locale?: string) => {
  const copy = getCopy(locale);
  const enabledDays = hours.filter((item) => item.enabled);
  if (enabledDays.length === 0) return copy.validation.hours.noDays;
  const invalid = enabledDays.find((item) => timeToMinutes(item.start) >= timeToMinutes(item.end));
  if (invalid) return copy.validation.hours.timeRange;
  return '';
};

export const validateSalon = (form: SalonForm, weekly: WeeklyHours[]) => {
  const copy = getCopy(form.locale);
  const errors: Record<string, string> = {};
  if (form.name.trim().length < 2 || form.name.trim().length > 60) {
    errors.name = copy.validation.salon.name;
  }
  if (!form.timezone.trim()) {
    errors.timezone = copy.validation.salon.timezone;
  }
  if (!form.locale.trim()) {
    errors.locale = copy.validation.salon.locale;
  }
  if (!form.salonType) {
    errors.salonType = copy.validation.salon.type;
  }
  if (!form.currency.trim()) {
    errors.currency = copy.validation.salon.currency;
  }
  const hoursError = validateWeeklyHours(weekly, form.locale);
  if (hoursError) errors.hours = hoursError;
  return errors;
};

export const validateStaffAndService = (
  staff: StaffForm,
  staffHours: WeeklyHours[],
  service: ServiceForm,
  assignService: boolean,
  locale?: string
) => {
  const copy = getCopy(locale);
  const errors: Record<string, string> = {};
  if (staff.name.trim().length < 2 || staff.name.trim().length > 60) {
    errors.staffName = copy.validation.staff.name;
  }
  if (!RoleOptions.includes(staff.role)) {
    errors.staffRole = copy.validation.staff.role;
  }
  if (staff.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staff.email)) {
    errors.staffEmail = copy.validation.staff.email;
  }
  if (!staff.sameHours) {
    const hoursError = validateWeeklyHours(staffHours, locale);
    if (hoursError) errors.staffHours = hoursError;
  }
  if (service.name.trim().length < 2 || service.name.trim().length > 60) {
    errors.serviceName = copy.validation.staff.serviceName;
  }
  const durationValue = Number(service.durationMinutes);
  if (Number.isNaN(durationValue) || durationValue < 5 || durationValue > 480) {
    errors.serviceDuration = copy.validation.staff.serviceDuration;
  }
  const priceValue = toMinorUnits(Number(service.priceDisplay));
  if (Number.isNaN(priceValue) || priceValue <= 0) {
    errors.servicePrice = copy.validation.staff.servicePrice;
  }
  if (!(BufferOptions as unknown as number[]).includes(service.bufferMinutes)) {
    errors.serviceBuffer = copy.validation.staff.serviceBuffer;
  }
  if (!assignService) {
    errors.assignService = copy.validation.staff.assignService;
  }
  return errors;
};

export const validateBooking = (
  booking: BookingForm,
  salonId: string | null,
  assignService: boolean,
  locale?: string
) => {
  const copy = getCopy(locale);
  const errors: Record<string, string> = {};
  if (booking.customerName.trim().length < 2) {
    errors.customerName = copy.validation.booking.customerName;
  }
  if (!booking.date || !booking.time) {
    errors.bookingTime = copy.validation.booking.time;
  }
  if (!salonId) {
    errors.salonId = copy.validation.booking.salonId;
  }
  if (!assignService) {
    errors.assignService = copy.validation.booking.assignService;
  }
  return errors;
};
