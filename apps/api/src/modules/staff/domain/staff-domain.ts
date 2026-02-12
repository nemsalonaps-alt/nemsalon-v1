export type StaffRole = 'owner' | 'admin' | 'staff';

export type StaffProfile = {
  id: string;
  salonId: string;
  name: string;
  role: StaffRole;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  active: boolean;
};

export type { BusinessHoursEntry } from '../../salons/domain/salons-domain.js';

export type StaffTimeOff = {
  id: string;
  salonId: string;
  staffId: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
};
