import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../../auth/service/auth-service.js';
import { listOutboxEntries } from '../repo/notifications-repo.js';
import { queueNotification } from '../repo/notifications-repo.js';
import { providers } from '../../../config/providers.js';

export function registerNotificationsRoutes(app: FastifyInstance) {
  const outboxQuerySchema = z.object({
    status: z.enum(['pending', 'processing', 'sent', 'failed']).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional()
  });

  const sendSchema = z.object({
    type: z.enum(['email', 'sms', 'push']),
    to: z.string().min(1),
    template: z.string().min(1),
    data: z.record(z.unknown()).optional()
  });

  app.get('/v1/notifications/outbox', async (request, reply) => {
    const query = outboxQuerySchema.parse(request.query);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');
    const entries = await listOutboxEntries({
      salonId,
      status: query.status,
      limit: query.limit ?? 50
    });
    reply.code(200).send({ entries });
  });

  app.post('/v1/notifications/send', async (request, reply) => {
    const body = sendSchema.parse(request.body);
    const salonId = await authService.requirePrimarySalonId(request);
    await authService.requireRole(request, salonId, 'owner');
    const provider =
      body.type === 'email'
        ? providers.notifications.email.provider
        : body.type === 'sms'
          ? providers.notifications.sms.provider
          : providers.notifications.push.provider;
    const entry = await queueNotification({
      salonId,
      channel: body.type,
      provider,
      recipient: body.to,
      type: body.template,
      payload: body.data ?? {}
    });
    reply.code(202).send({ entry });
  });
}
