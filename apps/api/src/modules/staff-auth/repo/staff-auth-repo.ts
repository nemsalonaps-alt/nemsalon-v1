import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';

export const staffAuthRepo = {
  async createStaffInvite(input: {
    staffId: string;
    salonId: string;
    email: string;
    inviteToken: string;
  }) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('staff_auth')
      .insert({
        staff_id: input.staffId,
        salon_id: input.salonId,
        invited_email: input.email,
        invite_token: input.inviteToken,
        invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message);
    }

    return data;
  },

  async getStaffAuthByInviteToken(token: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('staff_auth')
      .select('*, staff_profiles(*)')
      .eq('invite_token', token)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  },

  async getStaffAuthByEmail(email: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('staff_auth')
      .select('*, staff_profiles(*)')
      .eq('invited_email', email.toLowerCase())
      .eq('active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  },

  async setPin(staffId: string, pinHash: string) {
    const client = getSupabaseClient();
    const { error } = await client
      .from('staff_auth')
      .update({
        pin_hash: pinHash,
        pin_set_at: new Date().toISOString()
      })
      .eq('staff_id', staffId);

    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message);
    }
  },

  async recordLogin(staffId: string, success: boolean) {
    const client = getSupabaseClient();
    
    if (success) {
      await client
        .from('staff_auth')
        .update({
          last_login_at: new Date().toISOString(),
          failed_login_attempts: 0,
          locked_until: null
        })
        .eq('staff_id', staffId);
    } else {
      const { data } = await client
        .from('staff_auth')
        .select('failed_login_attempts')
        .eq('staff_id', staffId)
        .single();
      
      const attempts = (data?.failed_login_attempts ?? 0) + 1;
      const lockedUntil = attempts >= 5 
        ? new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min lockout
        : null;
      
      await client
        .from('staff_auth')
        .update({
          failed_login_attempts: attempts,
          locked_until: lockedUntil
        })
        .eq('staff_id', staffId);
    }
  }
};
