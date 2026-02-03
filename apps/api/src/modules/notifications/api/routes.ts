import type { FastifyInstance } from 'fastify';
import { notImplemented } from '../../../server/not-implemented.js';

export function registerNotificationsRoutes(app: FastifyInstance) {
  app.post('/v1/notifications/send', async (request, reply) => {
    return notImplemented(reply, request, 'Send notification not implemented');
  });
}
