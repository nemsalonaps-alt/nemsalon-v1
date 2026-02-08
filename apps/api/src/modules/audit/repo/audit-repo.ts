import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';

export async function createAuditLog(input: {
  salonId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('audit_log').insert({
    salon_id: input.salonId ?? null,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? null
  });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
}
