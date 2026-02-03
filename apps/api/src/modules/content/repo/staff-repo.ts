import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { StaffProfile } from '../domain/content-domain.js';

export async function getStaffById(staffId: string): Promise<StaffProfile | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('staff_profiles').select('*').eq('id', staffId).maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapStaffRow(data) : null;
}

function mapStaffRow(row: Record<string, unknown>): StaffProfile {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    displayName: row.display_name as string,
    role: row.role as StaffProfile['role'],
    email: row.email as string | null,
    phone: row.phone as string | null,
    active: row.active as boolean
  };
}
