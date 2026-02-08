import type { FastifyInstance } from 'fastify';
import { notImplemented } from '../../../server/not-implemented.js';
import { authService } from '../service/auth-service.js';

export function registerAuthRoutes(app: FastifyInstance) {
  const authRateLimit = { max: 60, timeWindow: 60_000 };

  app.post('/v1/auth/login', async (request, reply) => {
    return notImplemented(reply, request, 'Auth login not implemented');
  });

  app.post('/v1/auth/refresh', async (request, reply) => {
    return notImplemented(reply, request, 'Auth refresh not implemented');
  });

  app.post('/v1/auth/logout', async (request, reply) => {
    return notImplemented(reply, request, 'Auth logout not implemented');
  });

  app.get('/v1/auth/me', { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    const me = await authService.getMe(request);
    reply.code(200).send(me);
  });
}
