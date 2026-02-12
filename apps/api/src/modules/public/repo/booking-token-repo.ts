import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';

export type BookingTokenRecord = {
  id: string;
  bookingId: string;
  tokenHash: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  lastUsedAt?: string | null;
};

export async function createBookingToken(input: {
  bookingId: string;
  tokenHash: string;
  expiresAt?: string | null;
}): Promise<BookingTokenRecord> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('booking_access_tokens')
    .insert({
      booking_id: input.bookingId,
      token_hash: input.tokenHash,
      expires_at: input.expiresAt ?? null
    })
    .select('*')
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapRow(data as Record<string, unknown>);
}

export async function getBookingTokenByHash(tokenHash: string): Promise<BookingTokenRecord | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('booking_access_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function touchBookingToken(id: string) {
  const client = getSupabaseClient();
  const { error } = await client
    .from('booking_access_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
}

export async function revokeBookingToken(id: string) {
  const client = getSupabaseClient();
  const { error } = await client
    .from('booking_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
}

function mapRow(row: Record<string, unknown>): BookingTokenRecord {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    tokenHash: row.token_hash as string,
    expiresAt: row.expires_at as string | null,
    revokedAt: row.revoked_at as string | null,
    lastUsedAt: row.last_used_at as string | null
  };
}
