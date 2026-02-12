export type PaymentStatus =
  | 'created'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'canceled'
  | 'pending'
  | 'paid';

export type Payment = {
  id: string;
  salonId: string;
  bookingId: string;
  provider: 'stripe';
  status: PaymentStatus;
  amount: number;
  currency: string;
  sessionId?: string | null;
  paymentIntentId?: string | null;
  providerEventId?: string | null;
  idempotencyKey?: string | null;
};
