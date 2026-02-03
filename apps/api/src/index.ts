import { buildApp } from './server/build-app.js';

const app = buildApp();

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

app
  .listen({ port, host })
  .then(() => {
    app.log.info({ port, host }, 'API server started');
  })
  .catch((error) => {
    app.log.error({ error }, 'Failed to start API server');
    process.exit(1);
  });
