import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { Payment, PaymentStatus } from '../domain/payments-domain.js';

export type PaymentInsert = {
  bookingId: string;
  provider: 'stripe' | 'mobilepay';
  amount: number;
  currency: string;
  status: PaymentStatus;
};

export async function createPayment(input: PaymentInsert): Promise<Payment> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .insert({
      booking_id: input.bookingId,
      provider: input.provider,
      amount: input.amount,
      currency: input.currency,
      status: input.status
    })
    .select('*')
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapPaymentRow(data);
}

export async function updatePaymentProviderReference(
  paymentId: string,
  providerReference: string
): Promise<Payment> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .update({ provider_reference: providerReference })
    .eq('id', paymentId)
    .select('*')
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapPaymentRow(data);
}

export async function markPaymentPaid(
  paymentId: string,
  payload: { providerReference?: string; providerEventId?: string; rawEvent?: Record<string, unknown> }
): Promise<Payment | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .update({
      status: 'paid',
      provider_reference: payload.providerReference,
      provider_event_id: payload.providerEventId,
      raw_event: payload.rawEvent
    })
    .eq('id', paymentId)
    .neq('status', 'paid')
    .select('*')
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapPaymentRow(data) : null;
}

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('payments').select('*').eq('id', paymentId).maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapPaymentRow(data) : null;
}

function mapPaymentRow(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    provider: row.provider as Payment['provider'],
    status: row.status as Payment['status'],
    amount: Number(row.amount),
    currency: row.currency as string,
    providerReference: row.provider_reference as string | null
  };
}
