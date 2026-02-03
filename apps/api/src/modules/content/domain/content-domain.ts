export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type Salon = {
  id: string;
  name: string;
  timezone: string;
  locale: string;
  currency: string;
  status?: 'draft' | 'active';
};

export type Booking = {
  id: string;
  salonId: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes?: string | null;
  totalAmount: number;
  currency: string;
};

export type Customer = {
  id: string;
  salonId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export type Service = {
  id: string;
  salonId: string;
  name: string;
  durationMinutes: number;
  bufferMinutes?: number;
  price: number;
  currency: string;
  active?: boolean;
};

export type BusinessHoursEntry = {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  startTime: string;
  endTime: string;
  enabled: boolean;
};

export type StaffProfile = {
  id: string;
  salonId: string;
  name: string;
  role: 'owner' | 'admin' | 'staff';
  email?: string | null;
  phone?: string | null;
  active: boolean;
};
