import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { NotificationOutboxEntry } from '../domain/notifications-domain.js';

export type NotificationInsert = {
  salonId: string;
  bookingId?: string | null;
  type: string;
  channel: 'email' | 'sms' | 'push';
  provider: string;
  recipient: string;
  payload: Record<string, unknown>;
  status?: 'pending' | 'processing' | 'sent' | 'failed';
  dedupeKey?: string | null;
  nextAttemptAt?: string | null;
};

export async function queueNotification(input: NotificationInsert): Promise<NotificationOutboxEntry | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('notification_outbox')
    .insert({
      salon_id: input.salonId,
      booking_id: input.bookingId ?? null,
      type: input.type,
      channel: input.channel,
      provider: input.provider,
      recipient: input.recipient,
      payload: input.payload,
      status: input.status ?? 'pending',
      dedupe_key: input.dedupeKey ?? null,
      next_attempt_at: input.nextAttemptAt ?? null
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return null;
    }
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapOutboxRow(data);
}

export async function listOutboxEntries(input: {
  salonId: string;
  status?: NotificationOutboxEntry['status'];
  limit?: number;
}): Promise<NotificationOutboxEntry[]> {
  const client = getSupabaseClient();
  let query = client.from('notification_outbox').select('*').eq('salon_id', input.salonId);
  if (input.status) {
    query = query.eq('status', input.status);
  }
  const { data, error } = await query.order('created_at', { ascending: false }).limit(input.limit ?? 50);
  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
  return (data ?? []).map(mapOutboxRow);
}

export async function claimOutboxEntries(input: {
  limit: number;
  workerId: string;
}): Promise<NotificationOutboxEntry[]> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();
  const { data: candidates, error } = await client
    .from('notification_outbox')
    .select('*')
    .in('status', ['pending', 'failed'])
    .or(`next_attempt_at.lte.${now},next_attempt_at.is.null`)
    .is('locked_at', null)
    .order('created_at', { ascending: true })
    .limit(input.limit);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  const ids = (candidates ?? []).map((row) => row.id as string);
  if (!ids.length) {
    return [];
  }

  const { data: locked, error: lockError } = await client
    .from('notification_outbox')
    .update({
      locked_at: now,
      locked_by: input.workerId,
      status: 'processing'
    })
    .in('id', ids)
    .is('locked_at', null)
    .select('*');

  if (lockError) {
    throw httpError(500, 'DATABASE_ERROR', lockError.message, { details: lockError.details });
  }

  return (locked ?? []).map(mapOutboxRow);
}

export async function markOutboxSent(input: { id: string; attempts: number }): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('notification_outbox')
    .update({
      status: 'sent',
      attempts: input.attempts,
      locked_at: null,
      locked_by: null
    })
    .eq('id', input.id);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
}

export async function markOutboxFailed(input: {
  id: string;
  attempts: number;
  nextAttemptAt: string | null;
}): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('notification_outbox')
    .update({
      status: 'failed',
      attempts: input.attempts,
      next_attempt_at: input.nextAttemptAt,
      locked_at: null,
      locked_by: null
    })
    .eq('id', input.id);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
}

export async function upsertWorkerHeartbeat(input: {
  workerName: string;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('worker_heartbeats')
    .upsert(
      {
        worker_name: input.workerName,
        last_seen_at: new Date().toISOString(),
        details: input.details ?? null
      },
      { onConflict: 'worker_name' }
    );

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
}

export async function getWorkerHeartbeat(workerName: string): Promise<{
  workerName: string;
  lastSeenAt: string;
  details?: Record<string, unknown> | null;
} | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('worker_heartbeats')
    .select('*')
    .eq('worker_name', workerName)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  if (!data) return null;
  return {
    workerName: data.worker_name as string,
    lastSeenAt: data.last_seen_at as string,
    details: (data.details as Record<string, unknown> | null) ?? null
  };
}

function mapOutboxRow(row: Record<string, unknown>): NotificationOutboxEntry {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    bookingId: row.booking_id as string | null,
    type: row.type as string,
    channel: row.channel as NotificationOutboxEntry['channel'],
    provider: row.provider as string,
    recipient: row.recipient as string,
    payload: (row.payload as Record<string, unknown>) ?? {},
    status: row.status as NotificationOutboxEntry['status'],
    dedupeKey: row.dedupe_key as string | null,
    attempts: typeof row.attempts === 'number' ? row.attempts : Number(row.attempts ?? 0),
    nextAttemptAt: row.next_attempt_at as string | null,
    lockedAt: row.locked_at as string | null,
    lockedBy: row.locked_by as string | null
  };
}
