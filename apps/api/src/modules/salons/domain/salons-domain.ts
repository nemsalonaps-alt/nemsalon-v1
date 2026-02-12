export type SalonType =
  | 'hair_salon'
  | 'nail_salon'
  | 'wellness_center'
  | 'massage_clinic'
  | 'tattoo_studio'
  | 'barbershop'
  | 'spa_wellness'
  | 'cosmetic_clinic';

export type Salon = {
  id: string;
  name: string;
  slug?: string | null;
  timezone: string;
  locale: string;
  salonType?: SalonType | null;
  currency: string;
  cancellationWindowMinutes: number;
  status?: 'draft' | 'active';
  stripeAccountId?: string | null;
  stripeDetailsSubmitted?: boolean;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeOnboardingCompletedAt?: string | null;
  stripeConnectState?: string | null;
  stripeConnectStateExpiresAt?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type BusinessHoursEntry = {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  startTime: string;
  endTime: string;
  enabled: boolean;
};
