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

export async function getStaffIdsForService(
  serviceId: string,
  salonId: string
): Promise<string[]> {
  const client = getSupabaseClient();
  const { data: links, error: linkError } = await client
    .from('staff_services')
    .select('staff_id')
    .eq('service_id', serviceId);

  if (linkError) {
    throw httpError(500, 'DATABASE_ERROR', linkError.message, { details: linkError.details });
  }

  const staffIds = (links ?? []).map((row) => row.staff_id as string);
  if (staffIds.length === 0) return [];

  const { data: staffRows, error } = await client
    .from('staff_profiles')
    .select('id, salon_id, active')
    .in('id', staffIds)
    .eq('salon_id', salonId)
    .eq('active', true);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (staffRows ?? []).map((row) => row.id as string);
}
