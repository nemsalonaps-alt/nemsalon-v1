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

function mapServiceRow(row: Record<string, unknown>): Service {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    name: row.name as string,
    durationMinutes: row.duration_minutes as number,
    priceAmount: Number(row.price_amount),
    currency: row.currency as string
  };
}
