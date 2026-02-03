import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { Booking, BookingStatus } from '../domain/content-domain.js';

export type BookingInsert = {
  salonId: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
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
      notes: input.notes ?? null,
      total_amount: input.totalAmount,
      currency: input.currency
    })
    .select('*')
    .single();

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

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<Booking | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
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
      cancelled_at: new Date().toISOString()
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

function mapBookingRow(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    customerId: row.customer_id as string,
    staffId: row.staff_id as string,
    serviceId: row.service_id as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    status: row.status as Booking['status'],
    notes: row.notes as string | null,
    totalAmount: Number(row.total_amount),
    currency: row.currency as string
  };
}
