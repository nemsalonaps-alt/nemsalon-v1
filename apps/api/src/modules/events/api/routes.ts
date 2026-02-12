import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../../auth/service/auth-service.js';
import { createEvent } from '../repo/events-repo.js';
import { getRequestContext } from '../../../server/request-context.js';

const allowedEvents = new Set([
  'auth.login_success',
  'onboarding.started',
  'onboarding.completed',
  'availability.viewed',
  'checkout.started',
  'booking.confirmed'
]);

export function registerEventsRoutes(app: FastifyInstance) {
  app.post('/v1/events', async (request, reply) => {
    const body = z
      .object({
        eventKey: z.string().min(1),
        metadata: z.record(z.unknown()).optional()
      })
      .parse(request.body);

    if (!allowedEvents.has(body.eventKey)) {
      reply.code(400).send({
        code: 'EVENT_NOT_ALLOWED',
        message: 'event.not_allowed',
        errorKey: 'event.not_allowed',
        messageKey: 'event.not_allowed',
        traceId: request.id
      });
      return;
    }

    await authService.resolveAuthUser(request);
    const context = getRequestContext(request);
    const salonId = context.salonId ?? (await authService.requirePrimarySalonId(request));

    await createEvent({
      eventKey: body.eventKey,
      userId: context.userId ?? null,
      salonId,
      metadata: body.metadata ?? null
    });

    reply.code(201).send({ ok: true });
  });
}
