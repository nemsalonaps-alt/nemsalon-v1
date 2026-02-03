import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';

export async function addStaffServices(staffId: string, serviceIds: string[]): Promise<string[]> {
  if (serviceIds.length === 0) return [];
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_services')
    .upsert(
      serviceIds.map((serviceId) => ({
        staff_id: staffId,
        service_id: serviceId
      })),
      { onConflict: 'staff_id,service_id' }
    )
    .select('service_id');

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map((row) => row.service_id as string);
}

export async function getStaffServiceIds(staffId: string): Promise<string[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_services')
    .select('service_id')
    .eq('staff_id', staffId);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map((row) => row.service_id as string);
}
