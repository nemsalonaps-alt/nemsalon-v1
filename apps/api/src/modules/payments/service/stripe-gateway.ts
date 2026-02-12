import Stripe from 'stripe';
import { env, requireEnv } from '../../../config/env.js';

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (!stripeClient) {
    // In test mode with mock key, return a mock client
    if (
      process.env.NODE_ENV === 'test' &&
      process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_mock')
    ) {
      stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });
      return stripeClient;
    }
    // Webhook secret is only needed for signature verification, not for API calls.
    requireEnv(['STRIPE_SECRET_KEY'], 'Stripe is not configured');
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
  }
  return stripeClient;
}

export async function createStripeCheckout(input: {
  bookingId: string;
  paymentId: string;
  salonId?: string;
  stripeAccountId?: string | null;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey?: string;
  customerEmail?: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{ checkoutUrl: string; sessionId: string; paymentIntentId?: string | null }> {
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amount,
              product_data: {
                name: input.description || 'Salon booking',
              },
            },
          },
        ],
        metadata: {
          bookingId: input.bookingId,
          paymentId: input.paymentId,
          ...(input.salonId ? { salonId: input.salonId } : {}),
          ...(input.metadata || {}),
        },
      },
      {
        ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
        ...(input.stripeAccountId ? { stripeAccount: input.stripeAccountId } : {}),
      },
    );

    if (!session.url || !session.id) {
      throw new Error('Stripe checkout session missing url or id.');
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        throw new Error('STRIPE_RATE_LIMIT: ' + error.message);
      }
      if (error.message.includes('Idempotency')) {
        throw new Error('STRIPE_IDEMPOTENCY_ERROR: ' + error.message);
      }
      throw new Error('STRIPE_ERROR: ' + error.message);
    }
    throw error;
  }
}

export async function getStripeCheckoutUrl(
  sessionId: string,
  stripeAccountId?: string | null,
): Promise<string | null> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    {},
    stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
  );
  return session?.url ?? null;
}

export async function getStripeCheckoutSession(sessionId: string, stripeAccountId?: string | null) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(
    sessionId,
    {},
    stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
  );
}

export async function getStripePaymentIntent(
  paymentIntentId: string,
  stripeAccountId?: string | null,
) {
  const stripe = getStripeClient();
  return stripe.paymentIntents.retrieve(
    paymentIntentId,
    {},
    stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
  );
}

export async function createStripeRefund(
  paymentIntentId: string,
  options: {
    amount?: number;
    reason?: string;
    stripeAccountId?: string | null;
    idempotencyKey?: string;
  } = {},
): Promise<{ refundId: string; status: string }> {
  const stripe = getStripeClient();
  const refund = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      ...(options.amount ? { amount: options.amount } : {}),
    },
    {
      ...(options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
      ...(options.stripeAccountId ? { stripeAccount: options.stripeAccountId } : {}),
    },
  );

  return {
    refundId: refund.id ?? 'unknown',
    status: refund.status ?? 'unknown',
  };
}

export async function exchangeStripeConnectCode(
  code: string,
): Promise<{ accountId: string; publishableKey: string }> {
  const stripe = getStripeClient();
  requireEnv(['STRIPE_CONNECT_CLIENT_ID'], 'Stripe Connect is not configured');
  const response = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code: code,
  });

  return {
    accountId: response.stripe_user_id ?? 'unknown',
    publishableKey: response.stripe_publishable_key ?? 'unknown',
  };
}

export async function getStripeAccount(accountId: string) {
  const stripe = getStripeClient();
  return stripe.accounts.retrieve(accountId);
}

export function constructStripeEvent(rawBody: string, signature: string): Stripe.Event {
  requireEnv(['STRIPE_WEBHOOK_SECRET'], 'Stripe webhook secret is not configured');
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET!);
}
