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
    slug?: string | null;
    status?: 'draft' | 'active';
    locale: string;
    salonType?: string | null;
    currency: string;
    timezone: string;
    cancellationWindowMinutes: number;
  };
};

export type AuthMeResponse = {
  user: AuthUser;
  memberships: Membership[];
  primarySalonId?: string | null;
  salon?: Membership['salon'] | null;
};
