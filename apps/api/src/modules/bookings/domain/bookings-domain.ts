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
