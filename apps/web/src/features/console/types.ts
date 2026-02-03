export type SalonSummary = {
  id: string;
  name: string;
  status: 'draft' | 'active';
  timezone: string;
  locale: string;
  currency: string;
};

export type AuthMeResponse = {
  user: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    phone?: string | null;
    primarySalonId?: string | null;
  };
  salon?: SalonSummary | null;
  primarySalonId?: string | null;
};

export type StaffProfile = {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'staff';
  active: boolean;
  email?: string | null;
  phone?: string | null;
};

export type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  bufferMinutes: number;
  price: number;
  currency: string;
  active: boolean;
};

export type BookingSummary = {
  id: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount: number;
  currency: string;
  customerName?: string | null;
  staffName?: string | null;
  serviceName?: string | null;
  paymentStatus?: string | null;
  paymentId?: string | null;
};

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

export type BusinessHoursEntry = {
  day: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
};

export type StaffTimeOff = {
  id: string;
  staffId: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
};

export type Payment = {
  id: string;
  bookingId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  providerReference?: string | null;
};
