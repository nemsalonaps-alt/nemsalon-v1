import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load env from .env.local
const envPath = resolve(process.cwd(), '..', '..', '.env.local');
loadEnv({ path: envPath, override: true });

// Always enable auth bypass for tests (override any .env.local value)
process.env.DEV_AUTH_BYPASS = 'true';

if (typeof process.env.PAYMENTS_USE_MOCK === 'undefined') {
  process.env.PAYMENTS_USE_MOCK = 'true';
}

if (typeof process.env.FEATURE_NOTIFICATIONS === 'undefined') {
  process.env.FEATURE_NOTIFICATIONS = 'mock';
}

// Set mock Stripe credentials for tests
if (typeof process.env.STRIPE_SECRET_KEY === 'undefined') {
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing';
}

if (typeof process.env.STRIPE_WEBHOOK_SECRET === 'undefined') {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock_secret_for_testing';
}

if (typeof process.env.STRIPE_CONNECT_CLIENT_ID === 'undefined') {
  process.env.STRIPE_CONNECT_CLIENT_ID = 'ca_test_mock_client_id';
}
