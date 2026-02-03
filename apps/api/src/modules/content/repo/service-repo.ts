import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { Service } from '../domain/content-domain.js';

export async function getServiceById(serviceId: string): Promise<Service | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('services').select('*').eq('id', serviceId).maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapServiceRow(data) : null;
}

export async function getServicesByIds(serviceIds: string[]): Promise<Service[]> {
  if (serviceIds.length === 0) return [];
  const client = getSupabaseClient();
  const { data, error } = await client.from('services').select('*').in('id', serviceIds);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapServiceRow);
}

export async function createService(input: {
  salonId: string;
  name: string;
  durationMinutes: number;
  bufferMinutes?: number;
  price: number;
  currency: string;
  active: boolean;
}): Promise<Service> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('services')
    .insert({
      salon_id: input.salonId,
      name: input.name,
      duration_minutes: input.durationMinutes,
      buffer_minutes: input.bufferMinutes ?? 0,
      price_amount: input.price,
      currency: input.currency,
      active: input.active
    })
    .select('*')
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapServiceRow(data);
}

function mapServiceRow(row: Record<string, unknown>): Service {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    name: row.name as string,
    durationMinutes: row.duration_minutes as number,
    bufferMinutes: row.buffer_minutes as number | undefined,
    price: Number(row.price_amount),
    currency: row.currency as string,
    active: row.active as boolean
  };
}
