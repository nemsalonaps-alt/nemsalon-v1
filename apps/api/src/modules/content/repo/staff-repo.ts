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

export async function createStaffProfile(input: {
  salonId: string;
  name: string;
  role: StaffProfile['role'];
  active: boolean;
  email?: string | null;
  phone?: string | null;
}): Promise<StaffProfile> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_profiles')
    .insert({
      salon_id: input.salonId,
      display_name: input.name,
      role: input.role,
      active: input.active,
      email: input.email ?? null,
      phone: input.phone ?? null
    })
    .select('*')
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapStaffRow(data);
}

export async function listStaffProfiles(salonId: string): Promise<StaffProfile[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_profiles')
    .select('*')
    .eq('salon_id', salonId)
    .order('display_name');

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapStaffRow);
}

export async function updateStaffProfile(input: {
  staffId: string;
  salonId: string;
  name?: string;
  role?: StaffProfile['role'];
  active?: boolean;
  email?: string | null;
  phone?: string | null;
}): Promise<StaffProfile | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_profiles')
    .update({
      display_name: input.name,
      role: input.role,
      active: input.active,
      email: input.email,
      phone: input.phone
    })
    .eq('id', input.staffId)
    .eq('salon_id', input.salonId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapStaffRow(data) : null;
}

function mapStaffRow(row: Record<string, unknown>): StaffProfile {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    name: row.display_name as string,
    role: row.role as StaffProfile['role'],
    email: row.email as string | null,
    phone: row.phone as string | null,
    active: row.active as boolean
  };
}
