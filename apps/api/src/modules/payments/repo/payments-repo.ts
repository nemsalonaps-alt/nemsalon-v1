import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { Payment, PaymentStatus } from '../domain/payments-domain.js';

export type PaymentInsert = {
  salonId: string;
  bookingId: string;
  provider: 'stripe';
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey?: string;
};

export async function createPayment(input: PaymentInsert): Promise<Payment> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .insert({
      salon_id: input.salonId,
      booking_id: input.bookingId,
      provider: input.provider,
      amount: input.amount,
      currency: input.currency,
      status: input.status,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw httpError(409, 'PAYMENT_EXISTS', 'Payment already exists for booking.');
    }
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapPaymentRow(data);
}

export async function updatePaymentProviderReference(
  paymentId: string,
  payload: { sessionId: string; paymentIntentId?: string | null },
): Promise<Payment> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .update({
      provider_reference: payload.sessionId,
      provider_intent_id: payload.paymentIntentId ?? null,
    })
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
  payload: {
    sessionId?: string;
    paymentIntentId?: string;
    providerEventId?: string;
    rawEvent?: Record<string, unknown>;
  },
): Promise<Payment | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .update({
      status: 'succeeded',
      provider_reference: payload.sessionId,
      provider_intent_id: payload.paymentIntentId,
      provider_event_id: payload.providerEventId,
      raw_event: payload.rawEvent,
    })
    .eq('id', paymentId)
    .neq('status', 'succeeded')
    .select('*')
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapPaymentRow(data) : null;
}

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapPaymentRow(data) : null;
}

export async function getPaymentByProviderReference(
  provider: Payment['provider'],
  providerReference: string,
): Promise<Payment | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('provider', provider)
    .eq('provider_reference', providerReference)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapPaymentRow(data) : null;
}

export async function getPaymentByProviderIntentId(
  provider: Payment['provider'],
  providerIntentId: string,
): Promise<Payment | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('provider', provider)
    .eq('provider_intent_id', providerIntentId)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapPaymentRow(data) : null;
}

export async function getActivePaymentForBooking(bookingId: string): Promise<Payment | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .in('status', ['created', 'requires_action', 'processing', 'pending', 'paid', 'succeeded'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapPaymentRow(data) : null;
}

export async function getPaymentByIdempotencyKey(
  bookingId: string,
  idempotencyKey: string,
): Promise<Payment | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('idempotency_key', idempotencyKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapPaymentRow(data) : null;
}

export async function listPaymentsForBookingIds(bookingIds: string[]): Promise<Payment[]> {
  if (bookingIds.length === 0) return [];
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .select('*')
    .in('booking_id', bookingIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapPaymentRow);
}

export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  payload?: {
    sessionId?: string | null;
    paymentIntentId?: string | null;
    providerEventId?: string | null;
    rawEvent?: Record<string, unknown> | null;
  },
): Promise<Payment | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('payments')
    .update({
      status,
      provider_reference: payload?.sessionId ?? undefined,
      provider_intent_id: payload?.paymentIntentId ?? undefined,
      provider_event_id: payload?.providerEventId ?? undefined,
      raw_event: payload?.rawEvent ?? undefined,
    })
    .eq('id', paymentId)
    .neq('status', status)
    .select('*')
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapPaymentRow(data) : null;
}

function mapPaymentRow(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    bookingId: row.booking_id as string,
    provider: row.provider as Payment['provider'],
    status: row.status as Payment['status'],
    amount: Number(row.amount),
    currency: row.currency as string,
    sessionId: row.provider_reference as string | null,
    paymentIntentId: row.provider_intent_id as string | null,
    providerEventId: row.provider_event_id as string | null,
    idempotencyKey: row.idempotency_key as string | null,
  };
}
