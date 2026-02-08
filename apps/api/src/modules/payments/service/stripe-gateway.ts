import Stripe from 'stripe';
import { env, requireEnv } from '../../../config/env.js';

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (!stripeClient) {
    // Webhook secret is only needed for signature verification, not for API calls.
    requireEnv(['STRIPE_SECRET_KEY'], 'Stripe is not configured');
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
  }
  return stripeClient;
}

export async function createStripeCheckout(input: {
  bookingId: string;
  paymentId: string;
  salonId?: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey?: string;
}): Promise<{ checkoutUrl: string; providerReference: string; providerIntentId?: string | null }> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amount,
            product_data: {
              name: 'Salon booking'
            }
          }
        }
      ],
      metadata: {
        bookingId: input.bookingId,
        paymentId: input.paymentId,
        ...(input.salonId ? { salonId: input.salonId } : {})
      }
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
  );

  if (!session.url || !session.id) {
    throw new Error('Stripe checkout session missing url or id.');
  }

  return {
    checkoutUrl: session.url,
    providerReference: session.id,
    providerIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null
  };
}

export async function getStripeCheckoutUrl(sessionId: string): Promise<string | null> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return session?.url ?? null;
}

export async function getStripeCheckoutSession(sessionId: string) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId);
}

export async function getStripePaymentIntent(paymentIntentId: string) {
  const stripe = getStripeClient();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

export async function createStripeRefund(input: {
  paymentIntentId: string;
  idempotencyKey?: string;
}) {
  const stripe = getStripeClient();
  return stripe.refunds.create(
    { payment_intent: input.paymentIntentId },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
  );
}

export function constructStripeEvent(rawBody: string, signature: string): Stripe.Event {
  requireEnv(['STRIPE_WEBHOOK_SECRET'], 'Stripe webhook secret is not configured');
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET!);
}
