export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

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
  priceAmount: number;
  currency: string;
};

export type StaffProfile = {
  id: string;
  salonId: string;
  displayName: string;
  role: 'owner' | 'admin' | 'staff';
  email?: string | null;
  phone?: string | null;
  active: boolean;
};
