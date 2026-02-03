import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';

export type StaffTimeOff = {
  id: string;
  salonId: string;
  staffId: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
};

export async function listStaffTimeOff(input: {
  staffIds: string[];
  fromUtc: string;
  toUtc: string;
}): Promise<StaffTimeOff[]> {
  if (input.staffIds.length === 0) return [];
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_time_off')
    .select('*')
    .in('staff_id', input.staffIds)
    .lt('start_time', input.toUtc)
    .gt('end_time', input.fromUtc);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapStaffTimeOff);
}

export async function listStaffTimeOffForSalon(input: {
  salonId: string;
  staffId?: string;
}): Promise<StaffTimeOff[]> {
  const client = getSupabaseClient();
  let query = client.from('staff_time_off').select('*').eq('salon_id', input.salonId);
  if (input.staffId) {
    query = query.eq('staff_id', input.staffId);
  }
  const { data, error } = await query.order('start_time', { ascending: true });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapStaffTimeOff);
}

export async function createStaffTimeOff(input: {
  salonId: string;
  staffId: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
}): Promise<StaffTimeOff> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_time_off')
    .insert({
      salon_id: input.salonId,
      staff_id: input.staffId,
      start_time: input.startTime,
      end_time: input.endTime,
      reason: input.reason ?? null
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23503') {
      throw httpError(400, 'STAFF_TIME_OFF_INVALID', 'error.staff.time_off_invalid');
    }
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapStaffTimeOff(data);
}

export async function deleteStaffTimeOff(input: {
  id: string;
  salonId: string;
}): Promise<boolean> {
  const client = getSupabaseClient();
  const { error, count } = await client
    .from('staff_time_off')
    .delete({ count: 'exact' })
    .eq('id', input.id)
    .eq('salon_id', input.salonId);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return Boolean(count && count > 0);
}

function mapStaffTimeOff(row: Record<string, unknown>): StaffTimeOff {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    staffId: row.staff_id as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    reason: row.reason as string | null
  };
}
