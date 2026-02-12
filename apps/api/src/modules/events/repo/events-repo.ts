import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';

export async function createEvent(input: {
  eventKey: string;
  userId?: string | null;
  salonId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('events').insert({
    event_key: input.eventKey,
    user_id: input.userId ?? null,
    salon_id: input.salonId ?? null,
    metadata: input.metadata ?? null
  });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
}
