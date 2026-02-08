import { env } from '../../../config/env.js';
import { providers, type PaymentProvider } from '../../../config/providers.js';
import { HttpError, httpError } from '../../../server/http-error.js';
import { getBookingById, updateBookingStatus } from '../../bookings/repo/bookings-repo.js';
import { getCustomerById } from '../../customers/repo/customers-repo.js';
import { notificationsService } from '../../notifications/service/notifications-service.js';
import {
  createPayment,
  getActivePaymentForBooking,
  getPaymentById,
  getPaymentByIdempotencyKey,
  getPaymentByProviderIntentId,
  getPaymentByProviderReference,
  markPaymentPaid,
  updatePaymentStatus,
  updatePaymentProviderReference
} from '../repo/payments-repo.js';
import { createAuditLog } from '../../audit/repo/audit-repo.js';
import { createEvent } from '../../events/repo/events-repo.js';
import {
  constructStripeEvent,
  createStripeCheckout,
  createStripeRefund,
  getStripeCheckoutSession,
  getStripeCheckoutUrl,
  getStripePaymentIntent
} from './stripe-gateway.js';

export type CheckoutInput = {
  bookingId: string;
  successUrl: string;
  cancelUrl: string;
  salonId?: string;
  userId?: string;
  idempotencyKey?: string;
};

export type CheckoutResult = {
  checkoutUrl: string;
  paymentId: string;
  provider: PaymentProvider;
};

function shouldUseMockPayments() {
  return (
    env.PAYMENTS_USE_MOCK === 'true' ||
    env.NODE_ENV === 'test' ||
    (env.NODE_ENV !== 'production' && !env.STRIPE_SECRET_KEY)
  );
}

function isPaymentSucceeded(status: string) {
  return status === 'paid' || status === 'succeeded';
}

function mapStripeIntentStatus(status: string) {
  switch (status) {
    case 'succeeded':
      return 'succeeded';
    case 'processing':
      return 'processing';
    case 'requires_action':
      return 'requires_action';
    case 'requires_payment_method':
      return 'failed';
    case 'canceled':
      return 'canceled';
    default:
      return 'created';
  }
}

function mapStripeSessionStatus(status: string) {
  switch (status) {
    case 'paid':
      return 'succeeded';
    case 'unpaid':
      return 'created';
    default:
      return 'created';
  }
}

export const paymentsService = {
  async createCheckoutForBooking(input: CheckoutInput): Promise<CheckoutResult> {
    const booking = await getBookingById(input.bookingId);
    if (!booking) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
    }

    if (input.salonId && booking.salonId !== input.salonId) {
      throw httpError(403, 'SALON_FORBIDDEN', 'You do not have access to this booking.');
    }

    if (booking.status !== 'pending') {
      throw httpError(409, 'BOOKING_NOT_PENDING', 'Booking is not in a payable state.');
    }

    const resolvedIdempotencyKey =
      input.idempotencyKey ??
      (input.userId ? `checkout:${booking.id}:${input.userId}` : `checkout:${booking.id}`);

    const existingByKey = resolvedIdempotencyKey
      ? await getPaymentByIdempotencyKey(booking.id, resolvedIdempotencyKey)
      : null;
    const existing = existingByKey ?? (await getActivePaymentForBooking(booking.id));

    if (existing) {
      if (['paid', 'succeeded'].includes(existing.status)) {
        throw httpError(409, 'PAYMENT_ALREADY_PAID', 'Booking is already paid.');
      }
      if (['failed', 'refunded', 'canceled'].includes(existing.status)) {
        throw httpError(409, 'PAYMENT_INACTIVE', 'Previous payment is not active.');
      }
      const checkoutUrl = await resolveCheckoutUrl(existing, booking, input);
      return {
        checkoutUrl,
        paymentId: existing.id,
        provider: existing.provider
      };
    }

    let payment = null;
    try {
      payment = await createPayment({
        salonId: booking.salonId,
        bookingId: booking.id,
        provider: 'stripe',
        amount: booking.totalAmount,
        currency: booking.currency,
        status: 'pending',
        idempotencyKey: resolvedIdempotencyKey
      });
    } catch (error) {
      if (error instanceof HttpError && error.code === 'PAYMENT_EXISTS') {
        const fallback = await getActivePaymentForBooking(booking.id);
        if (fallback) {
          if (['paid', 'succeeded'].includes(fallback.status)) {
            throw httpError(409, 'PAYMENT_ALREADY_PAID', 'Booking is already paid.');
          }
          const checkoutUrl = await resolveCheckoutUrl(fallback, booking, input);
          return {
            checkoutUrl,
            paymentId: fallback.id,
            provider: fallback.provider
          };
        }
      }
      throw error;
    }

    let checkoutUrl = '';
    let providerReference = '';

    if (shouldUseMockPayments()) {
      checkoutUrl = `https://checkout.mock/${payment.id}`;
      providerReference = `mock_${payment.id}`;
      await updatePaymentProviderReference(payment.id, { providerReference });
    } else {
      providers.payments.stripe.requireConfig();
      const checkout = await createStripeCheckout({
        bookingId: booking.id,
        paymentId: payment.id,
        salonId: booking.salonId,
        amount: booking.totalAmount,
        currency: booking.currency,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        idempotencyKey: resolvedIdempotencyKey
      });
      checkoutUrl = checkout.checkoutUrl;
      providerReference = checkout.providerReference;
      await updatePaymentProviderReference(payment.id, {
        providerReference,
        providerIntentId: checkout.providerIntentId ?? null
      });
    }

    await createAuditLog({
      salonId: booking.salonId,
      actorUserId: input.userId ?? null,
      action: 'payment.checkout_created',
      entityType: 'payment',
      entityId: payment.id,
      metadata: {
        bookingId: booking.id,
        provider: 'stripe'
      }
    });

    return {
      checkoutUrl,
      paymentId: payment.id,
      provider: 'stripe'
    };
  },

  async handleStripeWebhook(rawBody: string, signature?: string) {
    if (shouldUseMockPayments()) {
      let payload: {
        paymentId?: string;
        bookingId?: string;
        sessionId?: string;
        eventId?: string;
        intentId?: string;
      };
      try {
        payload = JSON.parse(rawBody) as typeof payload;
      } catch {
        throw httpError(400, 'STRIPE_PAYLOAD_INVALID', 'Invalid webhook payload.');
      }

      if (!payload.paymentId && !payload.sessionId && !payload.intentId) {
        throw httpError(400, 'STRIPE_METADATA_MISSING', 'Stripe session missing metadata.');
      }

      const payment =
        (payload.paymentId ? await getPaymentById(payload.paymentId) : null) ??
        (payload.sessionId
          ? await getPaymentByProviderReference('stripe', payload.sessionId)
          : null) ??
        (payload.intentId ? await getPaymentByProviderIntentId('stripe', payload.intentId) : null);

      if (!payment) {
        await createAuditLog({
          action: 'payment.webhook_orphaned',
          entityType: 'payment',
          metadata: payload as unknown as Record<string, unknown>
        });
        return { received: true, orphaned: true };
      }
      if (payload.bookingId && payment.bookingId !== payload.bookingId) {
        throw httpError(409, 'PAYMENT_BOOKING_MISMATCH', 'Payment does not match booking.');
      }

      const paid = await markPaymentPaid(payment.id, {
        providerReference: payload.sessionId ?? payment.providerReference ?? `mock_${payment.id}`,
        providerIntentId: payload.intentId ?? payment.providerIntentId ?? undefined,
        providerEventId: payload.eventId ?? `mock_event_${payment.id}`,
        rawEvent: payload as unknown as Record<string, unknown>
      });

      const booking = await updateBookingStatus(payment.bookingId, 'confirmed');
      if (!booking) {
        throw httpError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
      }
      const customer = await getCustomerById(booking.customerId);

      if (customer) {
        await notificationsService.queueBookingConfirmation({
          salonId: booking.salonId,
          bookingId: booking.id,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          startTime: booking.startTime,
          endTime: booking.endTime
        });
      }

      if (paid) {
        await createAuditLog({
          salonId: booking.salonId,
          action: 'payment.succeeded',
          entityType: 'payment',
          entityId: payment.id,
          metadata: { bookingId: booking.id }
        });
        await createAuditLog({
          salonId: booking.salonId,
          action: 'booking.confirmed',
          entityType: 'booking',
          entityId: booking.id
        });
        await createEvent({
          eventKey: 'booking.confirmed',
          salonId: booking.salonId,
          userId: null,
          metadata: { bookingId: booking.id, paymentId: payment.id }
        });
      }

      return { received: true, idempotent: !paid };
    }

    if (!signature) {
      throw httpError(400, 'STRIPE_SIGNATURE_MISSING', 'Missing Stripe signature header.');
    }

    const event = constructStripeEvent(rawBody, signature);
    if (event.type !== 'checkout.session.completed') {
      return { received: true };
    }

    const session = event.data.object as {
      id?: string;
      payment_intent?: string;
      metadata?: Record<string, string>;
    };
    const paymentId = session.metadata?.paymentId;
    const bookingId = session.metadata?.bookingId;
    const salonId = session.metadata?.salonId;
    const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;

    if (!paymentId && !session.id && !intentId) {
      throw httpError(400, 'STRIPE_METADATA_MISSING', 'Stripe session missing metadata.');
    }

    const payment =
      (paymentId ? await getPaymentById(paymentId) : null) ??
      (session.id ? await getPaymentByProviderReference('stripe', session.id) : null) ??
      (intentId ? await getPaymentByProviderIntentId('stripe', intentId) : null);

    if (!payment) {
      await createAuditLog({
        salonId: salonId ?? null,
        action: 'payment.webhook_orphaned',
        entityType: 'payment',
        metadata: {
          eventId: event.id,
          sessionId: session.id,
          paymentId,
          bookingId,
          intentId
        }
      });
      return { received: true, orphaned: true };
    }
    if (bookingId && payment.bookingId !== bookingId) {
      throw httpError(409, 'PAYMENT_BOOKING_MISMATCH', 'Payment does not match booking.');
    }

    let rawPayload: Record<string, unknown> | undefined;
    try {
      rawPayload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      rawPayload = undefined;
    }

    const paid = await markPaymentPaid(payment.id, {
      providerReference: session.id,
      providerIntentId: intentId ?? undefined,
      providerEventId: event.id,
      rawEvent: rawPayload
    });

    const booking = await updateBookingStatus(payment.bookingId, 'confirmed');
    if (!booking) {
      throw httpError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
    }
    const customer = await getCustomerById(booking.customerId);

    if (customer) {
      await notificationsService.queueBookingConfirmation({
        salonId: booking.salonId,
        bookingId: booking.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        startTime: booking.startTime,
        endTime: booking.endTime
      });
    }

    if (paid) {
      await createAuditLog({
        salonId: booking.salonId,
        action: 'payment.succeeded',
        entityType: 'payment',
        entityId: payment.id,
        metadata: { bookingId: booking.id }
      });
      await createAuditLog({
        salonId: booking.salonId,
        action: 'booking.confirmed',
        entityType: 'booking',
        entityId: booking.id
      });
      await createEvent({
        eventKey: 'booking.confirmed',
        salonId: booking.salonId,
        userId: null,
        metadata: { bookingId: booking.id, paymentId: payment.id }
      });
    }

    return { received: true, idempotent: !paid };
  },

  async refundPayment(input: {
    paymentId: string;
    salonId: string;
    userId?: string;
    idempotencyKey?: string;
    reason?: string;
  }) {
    const payment = await getPaymentById(input.paymentId);
    if (!payment) {
      throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
    }
    if (payment.salonId !== input.salonId) {
      throw httpError(403, 'SALON_FORBIDDEN', 'You do not have access to this payment.');
    }
    if (payment.status === 'refunded') {
      return { payment, idempotent: true };
    }
    if (!isPaymentSucceeded(payment.status)) {
      throw httpError(409, 'PAYMENT_NOT_REFUNDABLE', 'Payment is not refundable.');
    }

    if (shouldUseMockPayments()) {
      const updated = await updatePaymentStatus(payment.id, 'refunded', {
        providerEventId: `mock_refund_${payment.id}`,
        rawEvent: { refunded: true }
      });
      await updateBookingStatus(payment.bookingId, 'cancelled');
      await createAuditLog({
        salonId: payment.salonId,
        actorUserId: input.userId ?? null,
        action: 'payment.refunded',
        entityType: 'payment',
        entityId: payment.id,
        metadata: { bookingId: payment.bookingId, reason: input.reason ?? null }
      });
      return { payment: updated ?? payment, idempotent: false };
    }

    providers.payments.stripe.requireConfig();

    let intentId = payment.providerIntentId ?? null;
    if (!intentId && payment.providerReference) {
      const session = await getStripeCheckoutSession(payment.providerReference);
      if (typeof session.payment_intent === 'string') {
        intentId = session.payment_intent;
        await updatePaymentProviderReference(payment.id, {
          providerReference: payment.providerReference,
          providerIntentId: intentId
        });
      }
    }

    if (!intentId) {
      throw httpError(409, 'PAYMENT_INTENT_MISSING', 'Payment intent is missing.');
    }

    const refund = await createStripeRefund({
      paymentIntentId: intentId,
      idempotencyKey: input.idempotencyKey ?? `refund:${payment.id}`
    });

    const updated = await updatePaymentStatus(payment.id, 'refunded', {
      providerEventId: refund.id,
      providerIntentId: intentId,
      rawEvent: refund as unknown as Record<string, unknown>
    });

    await updateBookingStatus(payment.bookingId, 'cancelled');

    await createAuditLog({
      salonId: payment.salonId,
      actorUserId: input.userId ?? null,
      action: 'payment.refunded',
      entityType: 'payment',
      entityId: payment.id,
      metadata: {
        bookingId: payment.bookingId,
        refundId: refund.id,
        reason: input.reason ?? null
      }
    });

    return { payment: updated ?? payment, idempotent: false };
  },

  async reconcilePayment(input: { paymentId: string; salonId: string }) {
    const payment = await getPaymentById(input.paymentId);
    if (!payment) {
      throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
    }
    if (payment.salonId !== input.salonId) {
      throw httpError(403, 'SALON_FORBIDDEN', 'You do not have access to this payment.');
    }

    if (shouldUseMockPayments()) {
      return { payment, action: 'noop' };
    }

    if (payment.provider !== 'stripe') {
      throw httpError(409, 'PAYMENT_PROVIDER_NOT_SUPPORTED', 'Payment provider not supported.');
    }

    let intentId = payment.providerIntentId ?? null;
    if (!intentId && payment.providerReference) {
      const session = await getStripeCheckoutSession(payment.providerReference);
      if (typeof session.payment_intent === 'string') {
        intentId = session.payment_intent;
        await updatePaymentProviderReference(payment.id, {
          providerReference: payment.providerReference,
          providerIntentId: intentId
        });
      } else if (session.payment_status) {
        const status = mapStripeSessionStatus(session.payment_status);
        if (status !== payment.status) {
          const updated = await updatePaymentStatus(payment.id, status);
          if (status === 'succeeded') {
            await updateBookingStatus(payment.bookingId, 'confirmed');
          }
          return { payment: updated ?? payment, action: 'updated' };
        }
        return { payment, action: 'noop' };
      }
    }

    if (!intentId) {
      return { payment, action: 'noop' };
    }

    const intent = await getStripePaymentIntent(intentId);
    const targetStatus = mapStripeIntentStatus(intent.status);

    if (targetStatus === payment.status) {
      return { payment, action: 'noop' };
    }

    const updated = await updatePaymentStatus(payment.id, targetStatus, {
      providerIntentId: intentId
    });
    if (targetStatus === 'succeeded') {
      await updateBookingStatus(payment.bookingId, 'confirmed');
    }

    return { payment: updated ?? payment, action: 'updated' };
  }
};

async function resolveCheckoutUrl(
  payment: { id: string; provider: PaymentProvider; providerReference?: string | null },
  booking: { id: string; totalAmount: number; currency: string; salonId: string },
  input: CheckoutInput
): Promise<string> {
  if (shouldUseMockPayments()) {
    return `https://checkout.mock/${payment.id}`;
  }

  if (payment.provider !== 'stripe') {
    throw httpError(501, 'PAYMENT_PROVIDER_NOT_SUPPORTED', 'Payment provider not supported.');
  }

  providers.payments.stripe.requireConfig();

  if (payment.providerReference) {
    const existingUrl = await getStripeCheckoutUrl(payment.providerReference);
    if (existingUrl) {
      return existingUrl;
    }
  }

  const checkout = await createStripeCheckout({
    bookingId: booking.id,
    paymentId: payment.id,
    salonId: booking.salonId,
    amount: booking.totalAmount,
    currency: booking.currency,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    idempotencyKey: input.idempotencyKey ?? `checkout:${booking.id}`
  });
  await updatePaymentProviderReference(payment.id, {
    providerReference: checkout.providerReference,
    providerIntentId: checkout.providerIntentId ?? null
  });
  return checkout.checkoutUrl;
}
