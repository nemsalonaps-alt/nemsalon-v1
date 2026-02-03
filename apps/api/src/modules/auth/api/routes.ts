import type { FastifyInstance } from 'fastify';
import { notImplemented } from '../../../server/not-implemented.js';

export function registerAuthRoutes(app: FastifyInstance) {
  app.post('/v1/auth/login', async (request, reply) => {
    return notImplemented(reply, request, 'Auth login not implemented');
  });

  app.post('/v1/auth/refresh', async (request, reply) => {
    return notImplemented(reply, request, 'Auth refresh not implemented');
  });

  app.post('/v1/auth/logout', async (request, reply) => {
    return notImplemented(reply, request, 'Auth logout not implemented');
  });

  app.get('/v1/auth/me', async (request, reply) => {
    return notImplemented(reply, request, 'Auth me not implemented');
  });
}
