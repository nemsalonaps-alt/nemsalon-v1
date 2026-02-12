import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import {
  validateString,
  validateOptionalString,
  validateEnum,
  validateNumber
} from '../../../shared/validation.js';
import type { Booking, BookingStatus } from '../domain/bookings-domain.js';

export type BookingInsert = {
  salonId: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  expiresAt?: string | null;
  idempotencyKey?: string;
  notes?: string | null;
  totalAmount: number;
  currency: string;
};

export async function createBooking(input: BookingInsert): Promise<Booking> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bookings')
    .insert({
      salon_id: input.salonId,
      customer_id: input.customerId,
      staff_id: input.staffId,
      service_id: input.serviceId,
      start_time: input.startTime,
      end_time: input.endTime,
      status: input.status,
      expires_at: input.expiresAt ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      notes: input.notes ?? null,
      total_amount: input.totalAmount,
      currency: input.currency
    })
    .select('*')
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[DEBUG] Database error creating booking:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      // Log the actual columns being inserted to debug mismatches
      columns: Object.keys({
        salon_id: input.salonId,
        customer_id: input.customerId,
        staff_id: input.staffId,
        service_id: input.serviceId,
        start_time: input.startTime,
        end_time: input.endTime,
        status: input.status,
        idempotency_key: input.idempotencyKey ?? null,
        notes: input.notes ?? null,
        total_amount: input.totalAmount,
        currency: input.currency
      })
    });
    if (error.code === '23P01') {
      throw httpError(
        409,
        'BOOKING_TIME_NOT_AVAILABLE',
        'error.booking.time_not_available'
      );
    }
    if (error.code === '23505') {
      throw httpError(
        409,
        'BOOKING_IDEMPOTENCY_CONFLICT',
        'error.booking.idempotency_conflict'
      );
    }
    if (error.code === '23503') {
      throw httpError(400, 'BOOKING_INVALID_REFERENCE', 'error.booking.invalid_reference', {
        details: error.details
      });
    }
    // Include error code in the message for debugging
    const detailedMessage = error.code 
      ? `Database error ${error.code}: ${error.message}` 
      : `Database error: ${error.message}`;
    throw httpError(500, 'DATABASE_ERROR', detailedMessage, { 
      details: error.details,
      code: error.code,
      hint: error.hint
    });
  }

  return mapBookingRow(data);
}

export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('bookings').select('*').eq('id', bookingId).maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapBookingRow(data) : null;
}

export async function getBookingByIdempotencyKey(
  salonId: string,
  idempotencyKey: string
): Promise<Booking | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bookings')
    .select('*')
    .eq('salon_id', salonId)
    .eq('idempotency_key', idempotencyKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapBookingRow(data) : null;
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<Booking | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bookings')
    .update({ status, expires_at: status === 'pending' ? undefined : null })
    .eq('id', bookingId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapBookingRow(data) : null;
}

export async function updateBookingFields(input: {
  bookingId: string;
  status?: BookingStatus;
  notes?: string | null;
}): Promise<Booking | null> {
  const updates: Record<string, unknown> = {};
  if (input.status) updates.status = input.status;
  if (input.status && input.status !== 'pending') updates.expires_at = null;
  if (input.notes !== undefined) updates.notes = input.notes;

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bookings')
    .update(updates)
    .eq('id', input.bookingId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapBookingRow(data) : null;
}

export async function updateBookingSchedule(input: {
  bookingId: string;
  staffId: string;
  startTime: string;
  endTime: string;
}): Promise<Booking | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bookings')
    .update({
      staff_id: input.staffId,
      start_time: input.startTime,
      end_time: input.endTime
    })
    .eq('id', input.bookingId)
    .select('*')
    .maybeSingle();

  if (error) {
    if (error.code === '23P01') {
      throw httpError(
        409,
        'BOOKING_TIME_NOT_AVAILABLE',
        'error.booking.time_not_available'
      );
    }
    if (error.code === '23503') {
      throw httpError(400, 'BOOKING_INVALID_REFERENCE', 'error.booking.invalid_reference', {
        details: error.details
      });
    }
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapBookingRow(data) : null;
}

export async function cancelBooking(input: {
  bookingId: string;
  reasonKey?: string;
  note?: string;
}): Promise<Booking | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bookings')
    .update({
      status: 'cancelled',
      cancel_reason_key: input.reasonKey ?? null,
      cancel_note: input.note ?? null,
      cancelled_at: new Date().toISOString(),
      expires_at: null
    })
    .eq('id', input.bookingId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapBookingRow(data) : null;
}

export async function getBookingsForStaffInRange(
  staffIds: string[],
  fromUtc: string,
  toUtc: string
): Promise<{ staffId: string; startTime: string; endTime: string }[]> {
  if (staffIds.length === 0) return [];
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bookings')
    .select('staff_id, start_time, end_time, status')
    .in('staff_id', staffIds)
    .lt('start_time', toUtc)
    .gt('end_time', fromUtc)
    .in('status', ['pending', 'confirmed', 'in_progress']);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map((row) => ({
    staffId: row.staff_id as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string
  }));
}

export async function listBookings(input: {
  salonId: string;
  fromUtc?: string;
  toUtc?: string;
  staffId?: string;
  status?: BookingStatus;
  limit?: number;
}): Promise<Booking[]> {
  const client = getSupabaseClient();
  let query = client.from('bookings').select('*').eq('salon_id', input.salonId);

  if (input.staffId) {
    query = query.eq('staff_id', input.staffId);
  }
  if (input.status) {
    query = query.eq('status', input.status);
  }
  if (input.fromUtc) {
    query = query.gte('start_time', input.fromUtc);
  }
  if (input.toUtc) {
    query = query.lte('start_time', input.toUtc);
  }

  const { data, error } = await query
    .order('start_time', { ascending: true })
    .limit(input.limit ?? 100);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapBookingRow);
}

export async function listExpiredPendingBookings(limit: number): Promise<Booking[]> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('bookings')
    .select('*')
    .eq('status', 'pending')
    .lt('expires_at', now)
    .order('expires_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapBookingRow);
}

export async function expirePendingBookings(bookingIds: string[]): Promise<number> {
  if (bookingIds.length === 0) return 0;
  const client = getSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('bookings')
    .update({
      status: 'cancelled',
      cancel_reason_key: 'booking.expired',
      cancelled_at: now,
      expires_at: null
    })
    .in('id', bookingIds)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data?.length ?? 0;
}

function mapBookingRow(row: Record<string, unknown>): Booking {
  const validStatuses = ['pending', 'confirmed', 'in_progress', 'cancelled', 'completed', 'no_show'] as const;
  return {
    id: validateString(row.id, 'id'),
    salonId: validateString(row.salon_id, 'salon_id'),
    customerId: validateString(row.customer_id, 'customer_id'),
    staffId: validateString(row.staff_id, 'staff_id'),
    serviceId: validateString(row.service_id, 'service_id'),
    startTime: validateString(row.start_time, 'start_time'),
    endTime: validateString(row.end_time, 'end_time'),
    status: validateEnum(row.status as string, 'status', validStatuses),
    expiresAt: validateOptionalString(row.expires_at, 'expires_at'),
    notes: validateOptionalString(row.notes, 'notes'),
    totalAmount: validateNumber(row.total_amount, 'total_amount'),
    currency: validateString(row.currency, 'currency')
  };
}
