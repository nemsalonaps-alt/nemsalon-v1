import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const apiBase = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
const webBase = process.env.E2E_BASE_URL ?? process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';

const authDir = join(process.cwd(), 'apps/web/e2e/.auth');

function getSupabaseStorageKey() {
  return 'supabase.auth.token';
}

function buildStorageState(origin: string, key: string, value: string) {
  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [{ name: key, value }],
      },
    ],
  };
}

async function loginAndStore(email: string, password: string, filename: string) {
  const res = await fetch(`${apiBase}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${body}`);
  }
  const data = await res.json();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = data.expiresAt ?? now + 3600;
  const session = {
    access_token: data.accessToken,
    refresh_token: data.refreshToken,
    token_type: 'bearer',
    expires_in: Math.max(0, expiresAt - now),
    expires_at: expiresAt,
    user: data.user ?? { id: data.userId, email },
  };
  const key = getSupabaseStorageKey();
  const storage = buildStorageState(webBase, key, JSON.stringify(session));
  writeFileSync(join(authDir, filename), JSON.stringify(storage, null, 2));
}

async function waitForApi(url: string, retries = 30) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`API did not become ready at ${url}`);
}

export default async function globalSetup() {
  await waitForApi(`${apiBase}/health`);

  const reset = await fetch(`${apiBase}/v1/dev/reset`, { method: 'POST' });
  if (!reset.ok) {
    const body = await reset.text();
    throw new Error(`Failed to reset dev data: ${reset.status} ${body}`);
  }

  const setup = await fetch(`${apiBase}/v1/dev/setup`, { method: 'POST' });
  if (!setup.ok) {
    const body = await setup.text();
    throw new Error(`Failed to setup dev data: ${setup.status} ${body}`);
  }

  mkdirSync(authDir, { recursive: true });
  await loginAndStore(
    process.env.DEV_OWNER_EMAIL ?? 'dev-owner@nemsalon.test',
    process.env.DEV_OWNER_PASSWORD ?? 'dev123456',
    'owner.json',
  );
  await loginAndStore(
    process.env.DEV_STAFF_EMAIL ?? 'dev-staff@nemsalon.test',
    process.env.DEV_STAFF_PASSWORD ?? 'dev123456',
    'staff.json',
  );
  await loginAndStore(
    process.env.DEV_CUSTOMER_EMAIL ?? 'dev-customer@nemsalon.test',
    process.env.DEV_CUSTOMER_PASSWORD ?? 'dev123456',
    'customer.json',
  );
}
