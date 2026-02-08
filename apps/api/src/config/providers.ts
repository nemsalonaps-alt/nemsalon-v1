import { env, requireEnv } from './env.js';

export const providers = {
  payments: {
    stripe: {
      name: 'stripe',
      enabled: Boolean(env.STRIPE_SECRET_KEY),
      requireConfig: () =>
        requireEnv(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], 'Stripe is not configured')
    }
  },
  notifications: {
    sms: {
      provider: 'twilio',
      enabled: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM)
    },
    email: {
      provider: 'postmark',
      enabled: Boolean(env.POSTMARK_SERVER_TOKEN && env.POSTMARK_FROM)
    },
    push: {
      provider: 'fcm',
      enabled: Boolean(env.FCM_SERVICE_ACCOUNT_JSON)
    }
  },
  database: {
    provider: 'supabase',
    enabled: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
  }
} as const;

export type PaymentProvider = keyof typeof providers.payments;
