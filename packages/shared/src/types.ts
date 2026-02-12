/**
 * Shared domain types for Nemsalon
 * Consolidated from apps/web/src/features to prevent duplication
 */

import type { SalonType } from './constants.js';

export type SalonStatus = 'draft' | 'active';

export type MembershipRole = 'owner' | 'admin' | 'staff';

export type SalonSummary = {
  id: string;
  name: string;
  slug?: string | null;
  status: SalonStatus;
  timezone: string;
  locale: string;
  salonType?: string | null;
  currency: string;
  cancellationWindowMinutes: number;
  stripeAccountId?: string | null;
  stripeDetailsSubmitted?: boolean;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeOnboardingCompletedAt?: string | null;
};

export type Membership = {
  id: string;
  salonId: string;
  role: MembershipRole;
  active: boolean;
  salon?: {
    id: string;
    name?: string | null;
    slug?: string | null;
    status?: SalonStatus;
    locale?: string | null;
    salonType?: SalonType | null;
    currency?: string | null;
    timezone?: string | null;
    cancellationWindowMinutes?: number | null;
  };
};

/**
 * AuthMeResponse - Consolidated from:
 * - apps/web/src/features/console/types.ts
 * - apps/web/src/features/onboarding/types.ts
 */
export type AuthMeResponse = {
  user: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    phone?: string | null;
    primarySalonId?: string | null;
  };
  memberships: Membership[];
  salon?: SalonSummary | null;
  primarySalonId?: string | null;
  isPlatformAdmin?: boolean;
};

export type DayId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type WeeklyHours = {
  day: DayId;
  enabled: boolean;
  start: string;
  end: string;
};

export type BusinessHoursEntry = {
  day: DayId;
  startTime: string;
  endTime: string;
  enabled: boolean;
};
