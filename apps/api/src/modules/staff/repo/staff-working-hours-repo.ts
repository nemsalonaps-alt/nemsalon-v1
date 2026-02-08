import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { BusinessHoursEntry } from '../domain/staff-domain.js';

export async function listStaffWorkingHours(staffId: string): Promise<BusinessHoursEntry[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_working_hours')
    .select('*')
    .eq('staff_id', staffId);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapRow);
}

export async function listStaffWorkingHoursForStaffIds(
  staffIds: string[]
): Promise<Array<BusinessHoursEntry & { staffId: string }>> {
  if (staffIds.length === 0) return [];
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_working_hours')
    .select('*')
    .in('staff_id', staffIds);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map((row) => ({
    ...mapRow(row),
    staffId: row.staff_id as string
  }));
}

export async function replaceStaffWorkingHours(
  staffId: string,
  weekly: BusinessHoursEntry[]
): Promise<BusinessHoursEntry[]> {
  const client = getSupabaseClient();
  const { error: deleteError } = await client.from('staff_working_hours').delete().eq('staff_id', staffId);

  if (deleteError) {
    throw httpError(500, 'DATABASE_ERROR', deleteError.message, { details: deleteError.details });
  }

  if (weekly.length === 0) return [];

  const { data, error } = await client
    .from('staff_working_hours')
    .insert(
      weekly.map((entry) => ({
        staff_id: staffId,
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

  return (data ?? []).map(mapRow);
}

function mapRow(row: Record<string, unknown>): BusinessHoursEntry {
  return {
    day: row.day as BusinessHoursEntry['day'],
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    enabled: row.enabled as boolean
  };
}
