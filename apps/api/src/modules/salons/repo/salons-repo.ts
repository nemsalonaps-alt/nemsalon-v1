import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import {
  validateString,
  validateOptionalString,
  validateNumber,
} from '../../../shared/validation.js';
import type { Salon } from '../domain/salons-domain.js';

export type SalonInsert = {
  name: string;
  slug?: string | null;
  timezone: string;
  locale: string;
  salonType?: Salon['salonType'];
  currency: string;
  cancellationWindowMinutes?: number;
  status?: 'draft' | 'active';
};

export type SalonUpdate = Partial<SalonInsert>;

export type SalonStripeUpdate = {
  stripeAccountId?: string | null;
  stripeDetailsSubmitted?: boolean;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeOnboardingCompletedAt?: string | null;
  stripeConnectState?: string | null;
  stripeConnectStateExpiresAt?: string | null;
};

export async function createSalon(input: SalonInsert): Promise<Salon> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('salons')
    .insert({
      name: input.name,
      slug: input.slug ?? null,
      timezone: input.timezone,
      locale: input.locale,
      ...(input.salonType ? { salon_type: input.salonType } : {}),
      currency: input.currency,
      ...(input.cancellationWindowMinutes !== undefined
        ? { cancellation_window_minutes: input.cancellationWindowMinutes }
        : {}),
      ...(input.status ? { status: input.status } : {}),
    })
    .select('*')
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapSalonRow(data);
}

export async function updateSalonById(salonId: string, input: SalonUpdate): Promise<Salon> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('salons')
    .update({
      ...(input.name ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.timezone ? { timezone: input.timezone } : {}),
      ...(input.locale ? { locale: input.locale } : {}),
      ...(input.salonType ? { salon_type: input.salonType } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.cancellationWindowMinutes !== undefined
        ? { cancellation_window_minutes: input.cancellationWindowMinutes }
        : {}),
      ...(input.status ? { status: input.status } : {}),
    })
    .eq('id', salonId)
    .select('*')
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapSalonRow(data);
}

export async function updateSalonStripeById(
  salonId: string,
  input: SalonStripeUpdate,
): Promise<Salon> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('salons')
    .update({
      ...(input.stripeAccountId !== undefined ? { stripe_account_id: input.stripeAccountId } : {}),
      ...(input.stripeDetailsSubmitted !== undefined
        ? { stripe_details_submitted: input.stripeDetailsSubmitted }
        : {}),
      ...(input.stripeChargesEnabled !== undefined
        ? { stripe_charges_enabled: input.stripeChargesEnabled }
        : {}),
      ...(input.stripePayoutsEnabled !== undefined
        ? { stripe_payouts_enabled: input.stripePayoutsEnabled }
        : {}),
      ...(input.stripeOnboardingCompletedAt !== undefined
        ? { stripe_onboarding_completed_at: input.stripeOnboardingCompletedAt }
        : {}),
      ...(input.stripeConnectState !== undefined
        ? { stripe_connect_state: input.stripeConnectState }
        : {}),
      ...(input.stripeConnectStateExpiresAt !== undefined
        ? { stripe_connect_state_expires_at: input.stripeConnectStateExpiresAt }
        : {}),
    })
    .eq('id', salonId)
    .select('*')
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapSalonRow(data);
}

export async function updateSalonStripeByAccountId(
  stripeAccountId: string,
  input: SalonStripeUpdate,
): Promise<Salon | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('salons')
    .update({
      ...(input.stripeDetailsSubmitted !== undefined
        ? { stripe_details_submitted: input.stripeDetailsSubmitted }
        : {}),
      ...(input.stripeChargesEnabled !== undefined
        ? { stripe_charges_enabled: input.stripeChargesEnabled }
        : {}),
      ...(input.stripePayoutsEnabled !== undefined
        ? { stripe_payouts_enabled: input.stripePayoutsEnabled }
        : {}),
      ...(input.stripeOnboardingCompletedAt !== undefined
        ? { stripe_onboarding_completed_at: input.stripeOnboardingCompletedAt }
        : {}),
    })
    .eq('stripe_account_id', stripeAccountId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapSalonRow(data) : null;
}

export async function getSalonByStripeConnectState(state: string): Promise<Salon | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('salons')
    .select('*')
    .eq('stripe_connect_state', state)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapSalonRow(data) : null;
}

export async function getSalonById(salonId: string): Promise<Salon | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('salons').select('*').eq('id', salonId).maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapSalonRow(data) : null;
}

export async function getSalonBySlug(slug: string): Promise<Salon | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('salons').select('*').eq('slug', slug).maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapSalonRow(data) : null;
}

function mapSalonRow(row: Record<string, unknown>): Salon {
  return {
    id: validateString(row.id, 'id'),
    name: validateString(row.name, 'name'),
    slug: validateOptionalString(row.slug, 'slug'),
    timezone: validateString(row.timezone, 'timezone'),
    locale: validateString(row.locale, 'locale'),
    salonType: validateOptionalString(row.salon_type, 'salon_type') as Salon['salonType'],
    currency: validateString(row.currency, 'currency'),
    cancellationWindowMinutes: validateNumber(
      row.cancellation_window_minutes,
      'cancellation_window_minutes',
    ),
    status: (validateOptionalString(row.status, 'status') as Salon['status']) ?? undefined,
    stripeAccountId: validateOptionalString(row.stripe_account_id, 'stripe_account_id'),
    stripeDetailsSubmitted: row.stripe_details_submitted as boolean | undefined,
    stripeChargesEnabled: row.stripe_charges_enabled as boolean | undefined,
    stripePayoutsEnabled: row.stripe_payouts_enabled as boolean | undefined,
    stripeOnboardingCompletedAt: validateOptionalString(
      row.stripe_onboarding_completed_at,
      'stripe_onboarding_completed_at',
    ),
    stripeConnectState: validateOptionalString(row.stripe_connect_state, 'stripe_connect_state'),
    stripeConnectStateExpiresAt: validateOptionalString(
      row.stripe_connect_state_expires_at,
      'stripe_connect_state_expires_at',
    ),
    phone: validateOptionalString(row.phone, 'phone'),
    email: validateOptionalString(row.email, 'email'),
    addressLine1: validateOptionalString(row.address_line1, 'address_line1'),
    addressLine2: validateOptionalString(row.address_line2, 'address_line2'),
    city: validateOptionalString(row.city, 'city'),
    postalCode: validateOptionalString(row.postal_code, 'postal_code'),
    country: validateOptionalString(row.country, 'country'),
  };
}
