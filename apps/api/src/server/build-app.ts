import fastify from 'fastify';
import { randomUUID } from 'crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { registerRoutes } from './register-routes.js';
import { registerErrorHandler } from './error-handler.js';
import { env } from '../config/env.js';

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

  app.register(helmet);

  const allowedOrigins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowAllOrigins = allowedOrigins.length === 0 && env.NODE_ENV !== 'production';

  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowAllOrigins || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error('Origin not allowed'), false);
    },
    credentials: true
  });

  const rateLimitMax = env.RATE_LIMIT_MAX ?? (env.NODE_ENV === 'production' ? 300 : 0);
  if (rateLimitMax > 0) {
    app.register(rateLimit, {
      max: rateLimitMax,
      timeWindow: env.RATE_LIMIT_WINDOW_MS ?? 60_000
    });
  }

  registerErrorHandler(app);
  registerRoutes(app);

  return app;
}
