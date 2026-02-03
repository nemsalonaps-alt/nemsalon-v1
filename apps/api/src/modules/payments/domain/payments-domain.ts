export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type Payment = {
  id: string;
  bookingId: string;
  provider: 'stripe' | 'mobilepay';
  status: PaymentStatus;
  amount: number;
  currency: string;
  providerReference?: string | null;
};
