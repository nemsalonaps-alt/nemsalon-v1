import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { notImplemented } from '../../../server/not-implemented.js';
import { authService } from '../../auth/service/auth-service.js';
import { listOutboxEntries } from '../repo/notifications-repo.js';

export function registerNotificationsRoutes(app: FastifyInstance) {
  const outboxQuerySchema = z.object({
    status: z.enum(['pending', 'processing', 'sent', 'failed']).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional()
  });

  app.get('/v1/notifications/outbox', async (request, reply) => {
    const query = outboxQuerySchema.parse(request.query);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireSalonRole(request, salonId, ['owner']);
    const entries = await listOutboxEntries({
      salonId,
      status: query.status,
      limit: query.limit ?? 50
    });
    reply.code(200).send({ entries });
  });

  app.post('/v1/notifications/send', async (request, reply) => {
    return notImplemented(reply, request, 'Send notification not implemented');
  });
}
