import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';

type ListOptions = {
  limit?: number;
  offset?: number;
};

type ListableQuery = {
  range: (from: number, to: number) => unknown;
  limit: (count: number) => unknown;
};

export async function listSalons(input: {
  status?: string;
  query?: string;
  limit?: number;
  offset?: number;
}) {
  const client = getSupabaseClient();
  let query = client
    .from('salons')
    .select(
      'id, name, slug, status, locale, salon_type, currency, timezone, cancellation_window_minutes, created_at, updated_at'
    );
  if (input.status) {
    query = query.eq('status', input.status);
  }
  if (input.query) {
    query = query.ilike('name', `%${input.query}%`);
  }
  if (input.offset) {
    query = query.range(input.offset, input.offset + (input.limit ?? 50) - 1);
  } else if (input.limit) {
    query = query.limit(input.limit);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
  return (data ?? []).map(mapSalonRow);
}

export async function getSalonById(salonId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('salons')
    .select(
      'id, name, slug, status, locale, salon_type, currency, timezone, cancellation_window_minutes, created_at, updated_at'
    )
    .eq('id', salonId)
    .maybeSingle();
  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
  return data ? mapSalonRow(data) : null;
}

export async function listBookingsForSalon(input: {
  salonId: string;
  from?: string;
  to?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const client = getSupabaseClient();
  let query = client.from('bookings').select('*').eq('salon_id', input.salonId);
  if (input.status) {
    query = query.eq('status', input.status);
  }
  if (input.from) {
    query = query.gte('start_time', input.from);
  }
  if (input.to) {
    query = query.lte('start_time', input.to);
  }
  applyListOptions(query, { limit: input.limit, offset: input.offset });
  const { data, error } = await query.order('start_time', { ascending: false });
  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
  return data ?? [];
}

export async function listPaymentsForSalon(input: {
  salonId: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const client = getSupabaseClient();
  let query = client.from('payments').select('*').eq('salon_id', input.salonId);
  if (input.status) {
    query = query.eq('status', input.status);
  }
  applyListOptions(query, { limit: input.limit, offset: input.offset });
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
  return data ?? [];
}

export async function listAuditLogs(input: {
  salonId?: string;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}) {
  const client = getSupabaseClient();
  let query = client.from('audit_log').select('*');
  if (input.salonId) {
    query = query.eq('salon_id', input.salonId);
  }
  if (input.actorUserId) {
    query = query.eq('actor_user_id', input.actorUserId);
  }
  if (input.entityType) {
    query = query.eq('entity_type', input.entityType);
  }
  if (input.entityId) {
    query = query.eq('entity_id', input.entityId);
  }
  applyListOptions(query, { limit: input.limit, offset: input.offset });
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
  return data ?? [];
}

function applyListOptions(query: ListableQuery, options: ListOptions) {
  if (options.offset) {
    query.range(options.offset, options.offset + (options.limit ?? 50) - 1);
    return;
  }
  if (options.limit) {
    query.limit(options.limit);
  }
}

function mapSalonRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: (row.slug as string | null) ?? null,
    status: row.status as string | null,
    locale: row.locale as string,
    salonType: row.salon_type as string | null,
    currency: row.currency as string,
    timezone: row.timezone as string,
    cancellationWindowMinutes: row.cancellation_window_minutes as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}
