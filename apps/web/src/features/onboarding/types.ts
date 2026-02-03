export type GateState = 'checking' | 'needs-onboarding' | 'has-salon' | 'needs-login';
export type StepId = 'salon' | 'staff' | 'payments' | 'cta';
export type DayId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type WeeklyHours = {
  day: DayId;
  enabled: boolean;
  start: string;
  end: string;
};

export type SalonForm = {
  name: string;
  timezone: string;
  locale: string;
  currency: string;
};

export type StaffForm = {
  name: string;
  role: 'owner' | 'admin' | 'staff';
  sameHours: boolean;
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

export type AuthMeResponse = {
  user: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    phone?: string | null;
    primarySalonId?: string | null;
  };
  memberships: Array<{
    id: string;
    salonId: string;
    role: 'owner' | 'admin' | 'staff';
    active: boolean;
    salon?: {
      id: string;
      name?: string | null;
      status?: 'draft' | 'active';
      locale?: string | null;
      currency?: string | null;
      timezone?: string | null;
    };
  }>;
  primarySalonId?: string | null;
  salon?: {
    id: string;
    name?: string | null;
    status?: 'draft' | 'active';
    locale?: string | null;
    currency?: string | null;
    timezone?: string | null;
  } | null;
};
