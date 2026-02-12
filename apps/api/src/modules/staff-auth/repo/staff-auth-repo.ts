import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';

export type StaffInvite = {
  id: string;
  staffId: string;
  salonId: string;
  invitedEmail: string;
  inviteToken: string;
  inviteExpiresAt: string;
  createdAt: string;
  staffName?: string | null;
  staffRole?: string | null;
};

export async function upsertStaffInvite(input: {
  staffId: string;
  salonId: string;
  invitedEmail: string;
  inviteToken: string;
  inviteExpiresAt: string;
}): Promise<StaffInvite> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_auth')
    .upsert({
      staff_id: input.staffId,
      salon_id: input.salonId,
      invited_email: input.invitedEmail,
      invite_token: input.inviteToken,
      invite_expires_at: input.inviteExpiresAt,
      active: true,
    })
    .select(
      'id, staff_id, salon_id, invited_email, invite_token, invite_expires_at, created_at, staff_profiles(display_name, role)',
    )
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return {
    id: data.id as string,
    staffId: data.staff_id as string,
    salonId: data.salon_id as string,
    invitedEmail: data.invited_email as string,
    inviteToken: data.invite_token as string,
    inviteExpiresAt: data.invite_expires_at as string,
    createdAt: data.created_at as string,
    staffName: (data.staff_profiles as { display_name?: string } | undefined)?.display_name ?? null,
    staffRole: (data.staff_profiles as { role?: string } | undefined)?.role ?? null,
  };
}

export async function listPendingInvites(salonId: string): Promise<StaffInvite[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_auth')
    .select(
      'id, staff_id, salon_id, invited_email, invite_token, invite_expires_at, created_at, staff_profiles(display_name, role)',
    )
    .eq('salon_id', salonId)
    .gt('invite_expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    staffId: row.staff_id as string,
    salonId: row.salon_id as string,
    invitedEmail: row.invited_email as string,
    inviteToken: row.invite_token as string,
    inviteExpiresAt: row.invite_expires_at as string,
    createdAt: row.created_at as string,
    staffName: (row.staff_profiles as { display_name?: string } | undefined)?.display_name ?? null,
    staffRole: (row.staff_profiles as { role?: string } | undefined)?.role ?? null,
  }));
}
