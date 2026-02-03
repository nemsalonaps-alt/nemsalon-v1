import Stripe from 'stripe';
import { env, requireEnv } from '../../../config/env.js';

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (!stripeClient) {
    requireEnv(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], 'Stripe is not configured');
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
  }
  return stripeClient;
}

export async function createStripeCheckout(input: {
  bookingId: string;
  paymentId: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string; providerReference: string }> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
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
      paymentId: input.paymentId
    }
  });

  if (!session.url || !session.id) {
    throw new Error('Stripe checkout session missing url or id.');
  }

  return { checkoutUrl: session.url, providerReference: session.id };
}

export function constructStripeEvent(rawBody: string, signature: string): Stripe.Event {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET!);
}
