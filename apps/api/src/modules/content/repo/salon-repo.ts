import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { Salon } from '../domain/content-domain.js';

export type SalonInsert = {
  name: string;
  timezone: string;
  locale: string;
  currency: string;
  status?: 'draft' | 'active';
};

export type SalonUpdate = Partial<SalonInsert>;

export async function createSalon(input: SalonInsert): Promise<Salon> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('salons')
    .insert({
      name: input.name,
      timezone: input.timezone,
      locale: input.locale,
      currency: input.currency,
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
      ...(input.timezone ? { timezone: input.timezone } : {}),
      ...(input.locale ? { locale: input.locale } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
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

function mapSalonRow(row: Record<string, unknown>): Salon {
  return {
    id: row.id as string,
    name: row.name as string,
    timezone: row.timezone as string,
    locale: row.locale as string,
    currency: row.currency as string,
    status: row.status as Salon['status']
  };
}
