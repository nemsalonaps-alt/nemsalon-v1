import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
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
      ...(input.status ? { status: input.status } : {})
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
      ...(input.status ? { status: input.status } : {})
    })
    .eq('id', salonId)
    .select('*')
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapSalonRow(data);
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
    id: row.id as string,
    name: row.name as string,
    slug: (row.slug as string | null) ?? null,
    timezone: row.timezone as string,
    locale: row.locale as string,
    salonType: row.salon_type as Salon['salonType'],
    currency: row.currency as string,
    cancellationWindowMinutes: row.cancellation_window_minutes as number,
    status: row.status as Salon['status'],
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    addressLine1: (row.address_line1 as string | null) ?? null,
    addressLine2: (row.address_line2 as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    postalCode: (row.postal_code as string | null) ?? null,
    country: (row.country as string | null) ?? null
  };
}
