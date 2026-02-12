import fastify from 'fastify';
import { randomUUID } from 'crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { registerRoutes } from './register-routes.js';
import { registerErrorHandler } from './error-handler.js';
import { env } from '../config/env.js';
import { checkSupabaseConnection, checkSupabaseMigrations } from './db.js';
import { getRequestContext } from './request-context.js';
import { createErrorEvent } from '../modules/observability/repo/error-events-repo.js';
import { getWorkerHeartbeat } from '../modules/notifications/repo/notifications-repo.js';

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

  app.addHook('onRequest', (request, reply, done) => {
    (request as { startTime?: bigint }).startTime = process.hrtime.bigint();
    reply.header('x-request-id', request.id);
    done();
  });

  app.addHook('onResponse', async (request, reply) => {
    const start = (request as { startTime?: bigint }).startTime;
    const durationMs = start ? Number(process.hrtime.bigint() - start) / 1e6 : undefined;
    const context = getRequestContext(request);
    const errorKey = (request as { errorKey?: string }).errorKey;
    const route = request.routeOptions?.url ?? request.raw.url;
    request.log.info(
      {
        route,
        status: reply.statusCode,
        durationMs,
        userId: context.userId ?? null,
        salonId: context.salonId ?? null,
        errorKey: errorKey ?? null,
        requestId: request.id
      },
      'request.completed'
    );
    if (reply.statusCode >= 400) {
      try {
        await createErrorEvent({
          route,
          status: reply.statusCode,
          errorKey: errorKey ?? null,
          requestId: request.id,
          userId: context.userId ?? null,
          salonId: context.salonId ?? null
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'error_event_failed';
        request.log.error({ error: message }, 'error_event.write_failed');
      }
    }
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ status: 'ready' }));
  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async (request, reply) => {
    const [connection, migrations] = await Promise.all([
      checkSupabaseConnection(request.log),
      checkSupabaseMigrations(request.log)
    ]);
    if (!connection.ok || !migrations.ok) {
      reply.code(503).send({
        status: 'not_ready',
        checks: {
          connection,
          migrations
        }
      });
      return;
    }
    const notificationsEnabled = env.FEATURE_NOTIFICATIONS !== 'false';
    const requireNotificationsWorker =
      env.NOTIFICATIONS_WORKER_REQUIRED === 'true' ||
      (env.NODE_ENV === 'production' && env.NOTIFICATIONS_WORKER_REQUIRED !== 'false');
    if (notificationsEnabled && requireNotificationsWorker) {
      const heartbeat = await getWorkerHeartbeat('notifications');
      const ttlSeconds = env.WORKER_HEARTBEAT_TTL_SECONDS ?? 60;
      const lastSeen = heartbeat?.lastSeenAt ? new Date(heartbeat.lastSeenAt).getTime() : 0;
      const stale = !lastSeen || Date.now() - lastSeen > ttlSeconds * 1000;
      if (stale) {
        reply.code(503).send({
          status: 'not_ready',
          checks: {
            connection,
            migrations,
            notificationsWorker: {
              ok: false,
              message: 'Notifications worker heartbeat stale or missing',
              lastSeenAt: heartbeat?.lastSeenAt ?? null
            }
          }
        });
        return;
      }
    }
    reply.code(200).send({
      status: 'ready',
      checks: {
        connection,
        migrations,
        notificationsWorker:
          notificationsEnabled && requireNotificationsWorker
            ? { ok: true }
            : { ok: true, skipped: true }
      }
    });
  });

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
  app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: env.RATE_LIMIT_WINDOW_MS ?? 60_000,
    global: rateLimitMax > 0
  });

  // Register cookie plugin for secure httpOnly cookies
  const cookieSecret = env.COOKIE_SECRET ?? (env.NODE_ENV === 'production' ? undefined : `dev-${randomUUID()}`);
  if (!cookieSecret) {
    throw new Error('COOKIE_SECRET must be set in production environment');
  }
  app.register(cookie, {
    secret: cookieSecret,
    parseOptions: {}
  });

  registerErrorHandler(app);
  registerRoutes(app);

  return app;
}
