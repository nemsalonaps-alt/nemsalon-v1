export type SalonSummary = {
  id: string;
  name: string;
  slug?: string | null;
  status: 'draft' | 'active';
  timezone: string;
  locale: string;
  salonType?: string | null;
  currency: string;
  cancellationWindowMinutes: number;
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
      slug?: string | null;
      status?: 'draft' | 'active';
      locale?: string | null;
      salonType?: string | null;
      currency?: string | null;
      timezone?: string | null;
      cancellationWindowMinutes?: number | null;
    };
  }>;
  salon?: SalonSummary | null;
  primarySalonId?: string | null;
};

export type StaffProfile = {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'staff';
  active: boolean;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
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

export type PlatformSalon = {
  id: string;
  name: string;
  slug?: string | null;
  status?: string | null;
  locale: string;
  salonType?: string | null;
  currency: string;
  timezone: string;
  cancellationWindowMinutes: number;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAuditEntry = {
  id: string;
  salon_id?: string | null;
  actor_user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type PlatformPayment = {
  id: string;
  salon_id: string;
  booking_id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  provider_reference?: string | null;
  provider_event_id?: string | null;
  created_at: string;
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

export type DashboardKPIs = {
  todayBookings: { total: number; completed: number; remaining: number };
  todayRevenue: { amount: number; currency: string; confirmedAmount: number };
  upcoming: { total: number; nextBooking: BookingSummary | null };
  systemStatus: 'healthy' | 'action-required';
  alerts: Array<{ type: 'payment' | 'webhook'; message: string; actionLink?: string }>;
};

export type DashboardData = {
  todayBookings: BookingSummary[];
  kpis: DashboardKPIs;
};
