import type { AuthMeResponse as SharedAuthMeResponse } from '@nemsalon/shared';

export type { SalonSummary, SalonType, DayId, WeeklyHours } from '@nemsalon/shared';

export type AuthMeResponse = SharedAuthMeResponse;

export type StaffProfile = {
  id: string;
  salonId: string;
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
  bufferMinutes?: number;
  price: number;
  currency: string;
  active?: boolean;
  salonId?: string;
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
  salonId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type PlatformPayment = {
  id: string;
  salonId: string;
  bookingId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  providerReference?: string | null;
  providerEventId?: string | null;
  createdAt: string;
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

export type { BusinessHoursEntry } from '@nemsalon/shared';

export type StaffTimeOff = {
  id: string;
  staffId: string;
  startUtc?: string;
  endUtc?: string;
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

export type PlatformUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: 'owner' | 'admin' | 'staff' | 'customer' | null;
  salonId: string | null;
  salonName: string | null;
  salonStatus: string | null;
  createdAt: string;
};

export type UsersListResponse = {
  data: PlatformUser[];
  meta: {
    total: number;
    limit: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
};

export type ImpersonationUser = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
  salonName?: string | null;
};

export type ImpersonationStatusResponse = {
  isImpersonating: boolean;
  impersonator: ImpersonationUser | null;
  impersonatedUser?: ImpersonationUser | null;
};
