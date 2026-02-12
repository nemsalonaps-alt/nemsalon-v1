import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load env for web/api base URLs and Supabase credentials
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const baseURL =
  process.env.E2E_BASE_URL ??
  process.env.PUBLIC_APP_URL ??
  'http://localhost:5173';

const reuseServers =
  process.env.E2E_REUSE_SERVERS === 'true' ||
  process.env.E2E_USE_RUNNING === '1' ||
  process.env.E2E_SKIP_WEBSERVER === '1';

export default defineConfig({
  testDir: 'apps/web/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on',
    video: 'on',
    screenshot: 'on'
  },
  webServer: reuseServers
    ? undefined
    : [
        {
          command: 'pnpm -C apps/api exec node --import tsx src/index.ts',
          url: 'http://localhost:3000/health',
          reuseExistingServer: true,
          timeout: 120_000,
          env: {
            ...process.env,
            PLATFORM_ADMIN_EMAILS:
              process.env.PLATFORM_ADMIN_EMAILS ??
              process.env.DEV_PLATFORM_ADMIN_EMAIL ??
              'dev-platform-admin@nemsalon.test',
            TMPDIR: '/tmp',
            TMP: '/tmp',
            TEMP: '/tmp',
          },
        },
        {
          command: 'pnpm -C apps/web dev -- --host 127.0.0.1 --port 5173 --strictPort',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
          env: {
            ...process.env,
            TMPDIR: '/tmp',
            TMP: '/tmp',
            TEMP: '/tmp',
          },
        }
      ],
  globalSetup: 'apps/web/e2e/global-setup.ts'
});
