import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { NotificationOutboxEntry } from '../domain/notifications-domain.js';

export type NotificationInsert = {
  salonId: string;
  bookingId?: string | null;
  channel: 'email' | 'sms' | 'push';
  provider: string;
  recipient: string;
  template: string;
  payload: Record<string, unknown>;
  status?: 'pending' | 'sent' | 'failed';
  dedupeKey?: string | null;
};

export async function queueNotification(input: NotificationInsert): Promise<NotificationOutboxEntry | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('notification_outbox')
    .insert({
      salon_id: input.salonId,
      booking_id: input.bookingId ?? null,
      channel: input.channel,
      provider: input.provider,
      recipient: input.recipient,
      template: input.template,
      payload: input.payload,
      status: input.status ?? 'pending',
      dedupe_key: input.dedupeKey ?? null
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

function mapOutboxRow(row: Record<string, unknown>): NotificationOutboxEntry {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    bookingId: row.booking_id as string | null,
    channel: row.channel as NotificationOutboxEntry['channel'],
    provider: row.provider as string,
    recipient: row.recipient as string,
    template: row.template as string,
    payload: (row.payload as Record<string, unknown>) ?? {},
    status: row.status as NotificationOutboxEntry['status'],
    dedupeKey: row.dedupe_key as string | null
  };
}
