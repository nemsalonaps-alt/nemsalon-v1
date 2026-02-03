import { copy } from './copy';
import type { BookingForm, SalonForm, ServiceForm, StaffForm, WeeklyHours } from './types';

export const dayLabels: Record<WeeklyHours['day'], string> = copy.dayLabels;

export const roleOptions = ['owner', 'admin', 'staff'] as const;
export const bufferOptions = [0, 5, 10, 15];

export const defaultWeeklyHours: WeeklyHours[] = [
  { day: 'mon', enabled: true, start: '09:00', end: '17:00' },
  { day: 'tue', enabled: true, start: '09:00', end: '17:00' },
  { day: 'wed', enabled: true, start: '09:00', end: '17:00' },
  { day: 'thu', enabled: true, start: '09:00', end: '17:00' },
  { day: 'fri', enabled: true, start: '09:00', end: '17:00' },
  { day: 'sat', enabled: false, start: '09:00', end: '17:00' },
  { day: 'sun', enabled: false, start: '09:00', end: '17:00' }
];

export const getBrowserTimezone = () =>
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : copy.salon.fields.timezonePlaceholder;

export const getBrowserLocale = () =>
  typeof navigator !== 'undefined' ? navigator.language : 'en';

export const normalizeLocale = (locale: string) => (locale.startsWith('da') ? 'da' : 'en');

export const defaultCurrencyForLocale = (locale: string) => (locale === 'da' ? 'DKK' : 'EUR');

export const timeToMinutes = (value: string) => {
  const [h, m] = value.split(':').map((part) => Number(part));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

export const addMinutes = (time: string, minutes: number) => {
  if (!time) return '';
  const [h, m] = time.split(':').map((part) => Number(part));
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = h * 60 + m + minutes;
  const nextH = Math.floor(total / 60) % 24;
  const nextM = total % 60;
  return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
};

export const parsePrice = (value: string) => {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  if (!normalized) return Number.NaN;
  return Number(normalized);
};

export const toMinorUnits = (value: string) => {
  const parsed = parsePrice(value);
  if (Number.isNaN(parsed)) return Number.NaN;
  return Math.round(parsed * 100);
};

export const validateWeeklyHours = (hours: WeeklyHours[]) => {
  const enabledDays = hours.filter((item) => item.enabled);
  if (enabledDays.length === 0) return copy.validation.hours.noDays;
  const invalid = enabledDays.find((item) => timeToMinutes(item.start) >= timeToMinutes(item.end));
  if (invalid) return copy.validation.hours.timeRange;
  return '';
};

export const validateSalon = (form: SalonForm, weekly: WeeklyHours[]) => {
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
  if (!form.currency.trim()) {
    errors.currency = copy.validation.salon.currency;
  }
  const hoursError = validateWeeklyHours(weekly);
  if (hoursError) errors.hours = hoursError;
  return errors;
};

export const validateStaffAndService = (
  staff: StaffForm,
  staffHours: WeeklyHours[],
  service: ServiceForm,
  assignService: boolean
) => {
  const errors: Record<string, string> = {};
  if (staff.name.trim().length < 2 || staff.name.trim().length > 60) {
    errors.staffName = copy.validation.staff.name;
  }
  if (!roleOptions.includes(staff.role)) {
    errors.staffRole = copy.validation.staff.role;
  }
  if (!staff.sameHours) {
    const hoursError = validateWeeklyHours(staffHours);
    if (hoursError) errors.staffHours = hoursError;
  }
  if (service.name.trim().length < 2 || service.name.trim().length > 60) {
    errors.serviceName = copy.validation.staff.serviceName;
  }
  const durationValue = Number(service.durationMinutes);
  if (Number.isNaN(durationValue) || durationValue < 5 || durationValue > 480) {
    errors.serviceDuration = copy.validation.staff.serviceDuration;
  }
  const priceValue = toMinorUnits(service.priceDisplay);
  if (Number.isNaN(priceValue) || priceValue <= 0) {
    errors.servicePrice = copy.validation.staff.servicePrice;
  }
  if (!bufferOptions.includes(service.bufferMinutes)) {
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
  assignService: boolean
) => {
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
