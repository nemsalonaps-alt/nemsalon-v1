import fastify from 'fastify';
import { randomUUID } from 'crypto';
import { registerRoutes } from './register-routes.js';
import { registerErrorHandler } from './error-handler.js';

export function buildApp() {
  const app = fastify({
    logger: true,
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      if (typeof incoming === 'string' && incoming.length > 0) {
        return incoming;
      }
      return randomUUID();
    }
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ status: 'ready' }));

  registerErrorHandler(app);
  registerRoutes(app);

  return app;
}
