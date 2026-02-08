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

export type BusinessHoursEntry = {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  startTime: string;
  endTime: string;
  enabled: boolean;
};

export type StaffTimeOff = {
  id: string;
  salonId: string;
  staffId: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
};
