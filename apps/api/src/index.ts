import './env-loader.js';
import { buildApp } from './server/build-app.js';
import { checkSupabaseConnection } from './server/db.js';
import { env } from './config/env.js';

const app = buildApp();

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

app
  .listen({ port, host })
  .then(async () => {
    app.log.info({ port, host }, 'API server started');
    if (env.NODE_ENV !== 'production') {
      await checkSupabaseConnection(app.log);
    }
  })
  .catch((error) => {
    app.log.error({ error }, 'Failed to start API server');
    process.exit(1);
  });
