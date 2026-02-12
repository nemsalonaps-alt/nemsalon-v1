export type AuthUser = {
  id: string;
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
  primarySalonId?: string | null;
  role?: 'owner' | 'admin' | 'staff' | 'customer' | null;
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
    stripeAccountId?: string | null;
    stripeDetailsSubmitted?: boolean;
    stripeChargesEnabled?: boolean;
    stripePayoutsEnabled?: boolean;
    stripeOnboardingCompletedAt?: string | null;
    stripeConnectState?: string | null;
    stripeConnectStateExpiresAt?: string | null;
  };
};

export type AuthMeResponse = {
  user: AuthUser;
  memberships: Membership[];
  primarySalonId?: string | null;
  salon?: Membership['salon'] | null;
  isPlatformAdmin?: boolean;
};
