import { getSupabaseClient } from '../../../server/db.js';
import crypto from 'crypto';

export const staffSessionRepo = {
  async createSession(input: {
    staffId: string;
    salonId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('staff_sessions')
      .insert({
        staff_id: input.staffId,
        salon_id: input.salonId,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt.toISOString(),
        ip_address: input.ipAddress || null,
        user_agent: input.userAgent || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return data;
  },

  async getSessionByToken(tokenHash: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('staff_sessions')
      .select('*, staff_profiles(*)')
      .eq('token_hash', tokenHash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    // Update last active
    await client
      .from('staff_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', data.id);

    return data;
  },

  async deleteSession(sessionId: string) {
    const client = getSupabaseClient();
    await client
      .from('staff_sessions')
      .delete()
      .eq('id', sessionId);
  },

  async deleteStaffSessions(staffId: string) {
    const client = getSupabaseClient();
    await client
      .from('staff_sessions')
      .delete()
      .eq('staff_id', staffId);
  }
};

// Use SHA256 for token hashing (fast for lookups, token itself is random)
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
