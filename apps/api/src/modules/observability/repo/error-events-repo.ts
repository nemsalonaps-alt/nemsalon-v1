import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';

export async function createErrorEvent(input: {
  route?: string | null;
  status: number;
  errorKey?: string | null;
  requestId?: string | null;
  userId?: string | null;
  salonId?: string | null;
}) {
  const client = getSupabaseClient();
  let { error } = await client.from('error_events').insert({
    route: input.route ?? null,
    status: input.status,
    error_key: input.errorKey ?? null,
    request_id: input.requestId ?? null,
    user_id: input.userId ?? null,
    salon_id: input.salonId ?? null
  });

  if (error && input.userId && error.code === '23503') {
    const retry = await client.from('error_events').insert({
      route: input.route ?? null,
      status: input.status,
      error_key: input.errorKey ?? null,
      request_id: input.requestId ?? null,
      user_id: null,
      salon_id: input.salonId ?? null
    });
    if (!retry.error) {
      return;
    }
    error = retry.error;
  }

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
}
