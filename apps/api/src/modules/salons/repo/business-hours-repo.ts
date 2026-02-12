import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { BusinessHoursEntry } from '../domain/salons-domain.js';

type BusinessHoursRow = {
  day: string;
  start_time: string;
  end_time: string;
  enabled: boolean;
};

export async function replaceSalonBusinessHours(
  salonId: string,
  entries: BusinessHoursEntry[]
): Promise<BusinessHoursEntry[]> {
  const client = getSupabaseClient();
  const { error: deleteError } = await client
    .from('salon_business_hours')
    .delete()
    .eq('salon_id', salonId);

  if (deleteError) {
    throw httpError(500, 'DATABASE_ERROR', deleteError.message, { details: deleteError.details });
  }

  const { data, error } = await client
    .from('salon_business_hours')
    .insert(
      entries.map((entry) => ({
        salon_id: salonId,
        day: entry.day,
        start_time: entry.startTime,
        end_time: entry.endTime,
        enabled: entry.enabled
      }))
    )
    .select('*');

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapBusinessHoursRow);
}

export async function getSalonBusinessHours(salonId: string): Promise<BusinessHoursEntry[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('salon_business_hours')
    .select('*')
    .eq('salon_id', salonId);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapBusinessHoursRow);
}

function mapBusinessHoursRow(row: BusinessHoursRow): BusinessHoursEntry {
  return {
    day: row.day as BusinessHoursEntry['day'],
    startTime: row.start_time,
    endTime: row.end_time,
    enabled: row.enabled
  };
}
