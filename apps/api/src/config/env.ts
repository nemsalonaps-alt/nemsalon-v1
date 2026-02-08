import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  POSTMARK_FROM: z.string().optional(),
  FCM_SERVICE_ACCOUNT_JSON: z.string().optional(),
  PAYMENTS_USE_MOCK: z.string().optional(),
  DEV_AUTH_BYPASS: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().optional(),
  FEATURE_AVAILABILITY: z.string().optional(),
  FEATURE_NOTIFICATIONS: z.string().optional(),
  FEATURE_CUSTOMER_PORTAL: z.enum(['true', 'false']).default('true'),
  PLATFORM_ADMIN_EMAILS: z.string().optional(),
  PLATFORM_ADMIN_TOKEN: z.string().optional(),
  PUBLIC_APP_URL: z.string().url().optional(),
  WEB_URL: z.string().url().optional(),
  COOKIE_SECRET: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

export function requireEnv(keys: (keyof Env)[], message?: string) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    const detail = missing.map((key) => key.toString()).join(', ');
    const error = new Error(message ?? `Missing required env: ${detail}`);
    (error as { statusCode?: number; code?: string }).statusCode = 500;
    (error as { statusCode?: number; code?: string }).code = 'CONFIG_ERROR';
    throw error;
  }
}
