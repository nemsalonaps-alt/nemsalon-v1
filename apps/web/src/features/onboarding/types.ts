import type { SalonType } from '@nemsalon/shared';

export type GateState =
  | 'checking'
  | 'recovering'
  | 'needs-onboarding'
  | 'has-salon'
  | 'needs-login'
  | 'error';
export type StepId = 'salon' | 'staff' | 'payments' | 'cta';

// Re-export shared types to maintain backwards compatibility
export type { DayId, SalonType, WeeklyHours, AuthMeResponse } from '@nemsalon/shared';

export type AvailabilitySlot = {
  startUtc: string;
  endUtc: string;
  staffId: string;
};

export type AvailabilityResponse = {
  slots: AvailabilitySlot[];
  meta: {
    fromUtc: string;
    days: number;
    intervalMinutes: number;
    serviceId: string;
    staffId?: string;
    timezone: string;
  };
};

export type SalonForm = {
  name: string;
  timezone: string;
  locale: string;
  salonType: SalonType | '';
  currency: string;
};

export type StaffForm = {
  name: string;
  role: 'owner' | 'admin' | 'staff';
  sameHours: boolean;
  email?: string;
};

export type ServiceForm = {
  name: string;
  durationMinutes: string;
  priceDisplay: string;
  bufferMinutes: number;
};

export type BookingForm = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time: string;
  notes: string;
  sendEmail: boolean;
  sendSms: boolean;
};

// AuthMeResponse is re-exported from @nemsalon/shared above
