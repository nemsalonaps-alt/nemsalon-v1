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
      'id, name, slug, status, locale, salon_type, currency, timezone, cancellation_window_minutes, created_at, updated_at',
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
      'id, name, slug, status, locale, salon_type, currency, timezone, cancellation_window_minutes, created_at, updated_at',
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
  return (data ?? []).map(mapPaymentRow);
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
  return (data ?? []).map(mapAuditRow);
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
    updatedAt: row.updated_at as string,
  };
}

function mapPaymentRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    bookingId: row.booking_id as string,
    provider: row.provider as string,
    status: row.status as string,
    amount: row.amount as number,
    currency: row.currency as string,
    providerReference: (row.provider_reference as string | null) ?? null,
    providerEventId: (row.provider_event_id as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapAuditRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    salonId: (row.salon_id as string | null) ?? null,
    actorUserId: (row.actor_user_id as string | null) ?? null,
    action: row.action as string,
    entityType: (row.entity_type as string | null) ?? null,
    entityId: (row.entity_id as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at as string,
  };
}

// Platform Admin Elite - New Functions

export async function universalSearch(input: { query: string; limit: number; types?: string[] }) {
  const client = getSupabaseClient();
  const results: SearchResult[] = [];
  const searchTypes = input.types ?? ['salon', 'booking', 'payment', 'customer', 'user'];

  // Search salons
  if (searchTypes.includes('salon')) {
    const { data: salons } = await client
      .from('salons')
      .select('id, name, status, locale, currency')
      .ilike('name', `%${input.query}%`)
      .limit(Math.ceil(input.limit / 3));

    for (const salon of salons ?? []) {
      results.push({
        type: 'salon',
        id: salon.id,
        title: salon.name,
        subtitle: `${salon.status} • ${salon.currency}`,
        salonId: salon.id,
        status: salon.status,
      });
    }
  }

  // Search bookings by ID
  if (searchTypes.includes('booking') && input.query.length > 5) {
    const { data: bookings } = await client
      .from('bookings')
      .select(
        'id, salon_id, status, start_time, total_amount, currency, customers:customer_id(name)',
      )
      .or(`id.ilike.%${input.query}%,status.ilike.%${input.query}%`)
      .limit(Math.ceil(input.limit / 4));

    for (const booking of bookings ?? []) {
      const bookingWithCustomer = booking as unknown as {
        id: string;
        salon_id: string;
        status: string;
        start_time: string;
        total_amount: number;
        currency: string;
        customers: { name: string }[] | null;
      };
      const customer = bookingWithCustomer.customers?.[0];
      results.push({
        type: 'booking',
        id: booking.id,
        title: `Booking ${booking.id.slice(0, 8)}`,
        subtitle: `${customer?.name ?? 'Unknown'} • ${booking.status} • ${booking.total_amount} ${booking.currency}`,
        salonId: booking.salon_id,
        status: booking.status,
      });
    }
  }

  // Search customers
  if (searchTypes.includes('customer')) {
    const { data: customers } = await client
      .from('customers')
      .select('id, salon_id, name, email, phone')
      .or(`name.ilike.%${input.query}%,email.ilike.%${input.query}%,phone.ilike.%${input.query}%`)
      .limit(Math.ceil(input.limit / 4));

    for (const customer of customers ?? []) {
      results.push({
        type: 'customer',
        id: customer.id,
        title: customer.name,
        subtitle: customer.email ?? customer.phone ?? 'No contact info',
        salonId: customer.salon_id,
        status: 'active',
      });
    }
  }

  // Search users (by email)
  if (searchTypes.includes('user')) {
    const { data: users } = await client
      .from('users')
      .select('id, email, full_name')
      .or(`email.ilike.%${input.query}%,full_name.ilike.%${input.query}%`)
      .limit(Math.ceil(input.limit / 4));

    for (const user of users ?? []) {
      results.push({
        type: 'user',
        id: user.id,
        title: user.full_name ?? user.email,
        subtitle: user.email,
        salonId: '',
        status: 'active',
      });
    }
  }

  return results.slice(0, input.limit);
}

export async function listIncidents(input: {
  status?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}) {
  const client = getSupabaseClient();
  let query = client.from('incidents').select('*');

  if (input.status) {
    query = query.eq('status', input.status);
  }
  if (input.severity) {
    query = query.eq('severity', input.severity);
  }

  applyListOptions(query, { limit: input.limit, offset: input.offset });

  const { data, error } = await query.order('started_at', { ascending: false });
  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return (data ?? []).map(mapIncidentRow);
}

export async function createIncident(input: {
  title: string;
  description?: string;
  severity: string;
  affectedSalonIds?: string[];
  createdBy: string;
}) {
  const client = getSupabaseClient();

  // Generate incident number
  const incidentNumber = `INC-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const { data, error } = await client
    .from('incidents')
    .insert({
      incident_number: incidentNumber,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: 'open',
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  // Add affected salons
  if (input.affectedSalonIds?.length) {
    await client.from('incident_affected_salons').insert(
      input.affectedSalonIds.map((salonId) => ({
        incident_id: data.id,
        salon_id: salonId,
      })),
    );
  }

  return mapIncidentRow(data);
}

export async function updateIncident(
  incidentId: string,
  input: Partial<{
    status: string;
    severity: string;
    title: string;
    description: string;
    rootCause: string;
    resolution: string;
    resolvedBy: string;
  }>,
) {
  const client = getSupabaseClient();

  const updates: Record<string, unknown> = {};
  if (input.status) updates.status = input.status;
  if (input.severity) updates.severity = input.severity;
  if (input.title) updates.title = input.title;
  if (input.description) updates.description = input.description;
  if (input.rootCause) updates.root_cause = input.rootCause;
  if (input.resolution) updates.resolution = input.resolution;
  if (input.resolvedBy) {
    updates.resolved_by = input.resolvedBy;
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('incidents')
    .update(updates)
    .eq('id', incidentId)
    .select()
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return mapIncidentRow(data);
}

export async function getIncidentTimeline(incidentId: string) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('incident_timeline')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return (data ?? []).map(mapTimelineEventRow);
}

export async function addIncidentTimelineEvent(input: {
  incidentId: string;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
}) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('incident_timeline')
    .insert({
      incident_id: input.incidentId,
      event_type: input.eventType,
      message: input.message,
      metadata: input.metadata ?? {},
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return mapTimelineEventRow(data);
}

export async function listFeatureFlags() {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('feature_flags')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return (data ?? []).map(mapFeatureFlagRow);
}

export async function getFeatureFlag(key: string) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('feature_flags')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return data ? mapFeatureFlagRow(data) : null;
}

export async function createFeatureFlag(input: {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutType: string;
  rolloutPercentage?: number;
  targetedSalonIds?: string[];
  createdBy: string;
}) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('feature_flags')
    .insert({
      key: input.key,
      name: input.name,
      description: input.description,
      enabled: input.enabled,
      rollout_type: input.rolloutType,
      rollout_percentage: input.rolloutPercentage,
      targeted_salon_ids: input.targetedSalonIds ?? [],
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return mapFeatureFlagRow(data);
}

export async function updateFeatureFlag(
  key: string,
  input: Partial<{
    name: string;
    description: string;
    enabled: boolean;
    rolloutType: string;
    rolloutPercentage: number;
    targetedSalonIds: string[];
  }>,
) {
  const client = getSupabaseClient();

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.enabled !== undefined) updates.enabled = input.enabled;
  if (input.rolloutType !== undefined) updates.rollout_type = input.rolloutType;
  if (input.rolloutPercentage !== undefined) updates.rollout_percentage = input.rolloutPercentage;
  if (input.targetedSalonIds !== undefined) updates.targeted_salon_ids = input.targetedSalonIds;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from('feature_flags')
    .update(updates)
    .eq('key', key)
    .select()
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return mapFeatureFlagRow(data);
}

export async function listDataExports(userId: string) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('data_exports')
    .select('*')
    .eq('requested_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return (data ?? []).map(mapDataExportRow);
}

export async function createDataExport(input: {
  exportType: string;
  salonId: string;
  format: string;
  requestedBy: string;
}) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('data_exports')
    .insert({
      export_type: input.exportType,
      salon_id: input.salonId,
      format: input.format,
      requested_by: input.requestedBy,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return mapDataExportRow(data);
}

// Helper type
interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  salonId: string;
  status: string;
}

// Mapper functions
function mapIncidentRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    incidentNumber: row.incident_number as string,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as string,
    severity: row.severity as string,
    rootCause: row.root_cause as string | null,
    resolution: row.resolution as string | null,
    startedAt: row.started_at as string,
    resolvedAt: row.resolved_at as string | null,
    createdBy: row.created_by as string | null,
    resolvedBy: row.resolved_by as string | null,
  };
}

function mapTimelineEventRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    incidentId: row.incident_id as string,
    eventType: row.event_type as string,
    message: row.message as string,
    metadata: row.metadata as Record<string, unknown> | null,
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
  };
}

function mapFeatureFlagRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    key: row.key as string,
    name: row.name as string,
    description: row.description as string | null,
    enabled: row.enabled as boolean,
    rolloutType: row.rollout_type as string,
    rolloutPercentage: row.rollout_percentage as number | null,
    targetedSalonIds: row.targeted_salon_ids as string[] | null,
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDataExportRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    exportType: row.export_type as string,
    format: row.format as string,
    salonId: row.salon_id as string | null,
    requestedBy: row.requested_by as string,
    status: row.status as string,
    fileUrl: row.file_url as string | null,
    fileSizeBytes: row.file_size_bytes as number | null,
    expiresAt: row.expires_at as string | null,
    createdAt: row.created_at as string,
    completedAt: row.completed_at as string | null,
  };
}

// Subscription Plans
export async function listSubscriptionPlans() {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_amount', { ascending: true });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    key: row.key as string,
    name: row.name as string,
    description: row.description as string | null,
    priceAmount: row.price_amount as number,
    priceCurrency: row.price_currency as string,
    billingInterval: row.billing_interval as string,
    features: row.features as string[],
    maxStaff: row.max_staff as number | null,
    maxBookingsMonthly: row.max_bookings_monthly as number | null,
    isActive: row.is_active as boolean,
  }));
}

// Dunning Status
export async function getDunningStatus() {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('dunning_attempts')
    .select('attempt_number, status')
    .order('created_at', { ascending: false });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  const cycle1 = data?.filter((d) => d.attempt_number === 1 && d.status !== 'success').length ?? 0;
  const cycle2 = data?.filter((d) => d.attempt_number === 2 && d.status !== 'success').length ?? 0;
  const cycle3 = data?.filter((d) => d.attempt_number === 3 && d.status !== 'success').length ?? 0;
  const failedPermanently =
    data?.filter((d) => d.attempt_number === 4 && d.status === 'failed').length ?? 0;

  return {
    cycle1,
    cycle2,
    cycle3,
    failedPermanently,
    total: cycle1 + cycle2 + cycle3 + failedPermanently,
  };
}

// Security Anomalies
export async function listSecurityAnomalies(input: {
  status?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}) {
  const client = getSupabaseClient();

  let query = client.from('security_anomalies').select('*');

  if (input.status) {
    query = query.eq('status', input.status);
  }
  if (input.severity) {
    query = query.eq('severity', input.severity);
  }
  if (input.limit) {
    query = query.limit(input.limit);
  }
  if (input.offset) {
    query = query.range(input.offset, input.offset + (input.limit ?? 50) - 1);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    anomalyType: row.anomaly_type as string,
    userId: row.user_id as string | null,
    salonId: row.salon_id as string | null,
    ipAddress: row.ip_address as string | null,
    userAgent: row.user_agent as string | null,
    description: row.description as string,
    severity: row.severity as string,
    status: row.status as string,
    investigatedBy: row.investigated_by as string | null,
    investigatedAt: row.investigated_at as string | null,
    createdAt: row.created_at as string,
  }));
}

export async function createSecurityAnomaly(input: {
  anomalyType: string;
  userId?: string;
  salonId?: string;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  severity: string;
  createdBy: string;
}) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('security_anomalies')
    .insert({
      anomaly_type: input.anomalyType,
      user_id: input.userId,
      salon_id: input.salonId,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
      description: input.description,
      severity: input.severity,
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return {
    id: data.id as string,
    anomalyType: data.anomaly_type as string,
    userId: data.user_id as string | null,
    salonId: data.salon_id as string | null,
    ipAddress: data.ip_address as string | null,
    userAgent: data.user_agent as string | null,
    description: data.description as string,
    severity: data.severity as string,
    status: data.status as string,
    createdAt: data.created_at as string,
  };
}

export async function updateSecurityAnomaly(
  anomalyId: string,
  input: {
    status?: string;
    investigatedBy?: string;
  },
) {
  const client = getSupabaseClient();

  const updates: Record<string, unknown> = {};
  if (input.status) updates.status = input.status;
  if (input.investigatedBy) {
    updates.investigated_by = input.investigatedBy;
    updates.investigated_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('security_anomalies')
    .update(updates)
    .eq('id', anomalyId)
    .select()
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message);
  }

  return {
    id: data.id as string,
    anomalyType: data.anomaly_type as string,
    userId: data.user_id as string | null,
    salonId: data.salon_id as string | null,
    description: data.description as string,
    severity: data.severity as string,
    status: data.status as string,
    investigatedBy: data.investigated_by as string | null,
    investigatedAt: data.investigated_at as string | null,
    createdAt: data.created_at as string,
  };
}
