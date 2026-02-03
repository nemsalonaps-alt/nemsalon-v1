export type AuthUser = {
  id: string;
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
  primarySalonId?: string | null;
};

export type Membership = {
  id: string;
  salonId: string;
  role: 'owner' | 'admin' | 'staff';
  active: boolean;
  salon?: {
    id: string;
    name: string;
    status?: 'draft' | 'active';
    locale: string;
    currency: string;
    timezone: string;
  };
};

export type AuthMeResponse = {
  user: AuthUser;
  memberships: Membership[];
  primarySalonId?: string | null;
  salon?: Membership['salon'] | null;
};
