import { env } from '../../../config/env.js';
import { providers, type PaymentProvider } from '../../../config/providers.js';
import { HttpError, httpError } from '../../../server/http-error.js';
import { getBookingById, updateBookingStatus } from '../../content/repo/booking-repo.js';
import { getCustomerById } from '../../content/repo/customer-repo.js';
import { notificationsService } from '../../notifications/service/notifications-service.js';
import {
  createPayment,
  getActivePaymentForBooking,
  getPaymentById,
  getPaymentByIdempotencyKey,
  markPaymentPaid,
  updatePaymentProviderReference
} from '../repo/payments-repo.js';
import { constructStripeEvent, createStripeCheckout, getStripeCheckoutUrl } from './stripe-gateway.js';

export type CheckoutInput = {
  bookingId: string;
  provider?: PaymentProvider;
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

    const provider = input.provider ?? 'stripe';
    if (provider === 'mobilepay') {
      throw httpError(501, 'MOBILEPAY_NOT_IMPLEMENTED', 'MobilePay checkout is not implemented yet.');
    }

    const resolvedIdempotencyKey =
      input.idempotencyKey ?? (input.userId ? `${booking.id}:${input.userId}` : undefined);

    const existingByKey = resolvedIdempotencyKey
      ? await getPaymentByIdempotencyKey(booking.id, resolvedIdempotencyKey)
      : null;
    const existing = existingByKey ?? (await getActivePaymentForBooking(booking.id));

    if (existing) {
      if (existing.status === 'paid') {
        throw httpError(409, 'PAYMENT_ALREADY_PAID', 'Booking is already paid.');
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
          if (fallback.status === 'paid') {
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

    if (env.PAYMENTS_USE_MOCK === 'true') {
      checkoutUrl = `https://checkout.mock/${payment.id}`;
      providerReference = `mock_${payment.id}`;
    } else {
      providers.payments.stripe.requireConfig();
      const checkout = await createStripeCheckout({
        bookingId: booking.id,
        paymentId: payment.id,
        amount: booking.totalAmount,
        currency: booking.currency,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl
      });
      checkoutUrl = checkout.checkoutUrl;
      providerReference = checkout.providerReference;
    }

    await updatePaymentProviderReference(payment.id, providerReference);

    return {
      checkoutUrl,
      paymentId: payment.id,
      provider: 'stripe'
    };
  },

  async handleStripeWebhook(rawBody: string, signature?: string) {
    if (env.PAYMENTS_USE_MOCK === 'true') {
      let payload: {
        paymentId?: string;
        bookingId?: string;
        sessionId?: string;
        eventId?: string;
      };
      try {
        payload = JSON.parse(rawBody) as typeof payload;
      } catch {
        throw httpError(400, 'STRIPE_PAYLOAD_INVALID', 'Invalid webhook payload.');
      }

      if (!payload.paymentId || !payload.bookingId) {
        throw httpError(400, 'STRIPE_METADATA_MISSING', 'Stripe session missing metadata.');
      }

      const payment = await getPaymentById(payload.paymentId);
      if (!payment) {
        throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
      }
      if (payment.bookingId !== payload.bookingId) {
        throw httpError(409, 'PAYMENT_BOOKING_MISMATCH', 'Payment does not match booking.');
      }

      const paid = await markPaymentPaid(payload.paymentId, {
        providerReference: payload.sessionId ?? `mock_${payload.paymentId}`,
        providerEventId: payload.eventId ?? `mock_event_${payload.paymentId}`,
        rawEvent: payload as unknown as Record<string, unknown>
      });

      const booking = await updateBookingStatus(payload.bookingId, 'confirmed');
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

      return { received: true, idempotent: !paid };
    }

    if (!signature) {
      throw httpError(400, 'STRIPE_SIGNATURE_MISSING', 'Missing Stripe signature header.');
    }

    const event = constructStripeEvent(rawBody, signature);
    if (event.type !== 'checkout.session.completed') {
      return { received: true };
    }

    const session = event.data.object as { id?: string; metadata?: Record<string, string> };
    const paymentId = session.metadata?.paymentId;
    const bookingId = session.metadata?.bookingId;

    if (!paymentId || !bookingId || !session.id) {
      throw httpError(400, 'STRIPE_METADATA_MISSING', 'Stripe session missing metadata.');
    }

    const payment = await getPaymentById(paymentId);
    if (!payment) {
      throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
    }
    if (payment.bookingId !== bookingId) {
      throw httpError(409, 'PAYMENT_BOOKING_MISMATCH', 'Payment does not match booking.');
    }

    let rawPayload: Record<string, unknown> | undefined;
    try {
      rawPayload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      rawPayload = undefined;
    }

    const paid = await markPaymentPaid(paymentId, {
      providerReference: session.id,
      providerEventId: event.id,
      rawEvent: rawPayload
    });

    const booking = await updateBookingStatus(bookingId, 'confirmed');
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

    return { received: true, idempotent: !paid };
  }
};

async function resolveCheckoutUrl(
  payment: { id: string; provider: PaymentProvider; providerReference?: string | null },
  booking: { id: string; totalAmount: number; currency: string },
  input: CheckoutInput
): Promise<string> {
  if (env.PAYMENTS_USE_MOCK === 'true') {
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
    amount: booking.totalAmount,
    currency: booking.currency,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl
  });
  await updatePaymentProviderReference(payment.id, checkout.providerReference);
  return checkout.checkoutUrl;
}
