/**
 * Availability Repository - Facade layer
 *
 * Dette repo fungerer som en facade der isolerer availability modulet
 * fra direkte afhængigheder af andre modulers repos.
 *
 * I stedet for at availability-service importerer 7 forskellige repos
 * fra content/, eksponerer dette repo kun de metoder som availability
 * faktisk har brug for.
 */

import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { BusinessHoursEntry } from '../../salons/domain/salons-domain.js';

// Types som availability modulet har brug for
export type BusinessHours = BusinessHoursEntry;

export type BookingWindow = {
  staffId: string;
  startTime: string;
  endTime: string;
};

export type StaffWorkingHours = {
  staffId: string;
  day: BusinessHoursEntry['day'];
  startTime: string;
  endTime: string;
  enabled: boolean;
};

export type StaffTimeOff = {
  staffId: string;
  startTime: string;
  endTime: string;
};

export type ServiceInfo = {
  id: string;
  salonId: string;
  durationMinutes: number;
  bufferMinutes?: number;
};

export type SalonInfo = {
  id: string;
  timezone: string;
};

export type StaffInfo = {
  id: string;
  salonId: string;
};

/**
 * Hent åbningstider for en salon
 */
export async function getBusinessHours(salonId: string): Promise<BusinessHours[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('salon_business_hours')
    .select('*')
    .eq('salon_id', salonId);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map((row) => ({
    day: row.day as BusinessHours['day'],
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    enabled: row.enabled as boolean
  }));
}

/**
 * Hent medarbejdere der kan udføre en specifik service
 */
export async function getStaffForService(serviceId: string, salonId: string): Promise<string[]> {
  const client = getSupabaseClient();

  // Find alle staff_ids der er linket til denne service
  const { data: links, error: linkError } = await client
    .from('staff_services')
    .select('staff_id')
    .eq('service_id', serviceId);

  if (linkError) {
    throw httpError(500, 'DATABASE_ERROR', linkError.message, { details: linkError.details });
  }

  const staffIds = (links ?? []).map((row) => row.staff_id as string);
  if (staffIds.length === 0) return [];

  // Filtrer til kun aktive medarbejdere fra denne salon
  const { data: staffRows, error } = await client
    .from('staff_profiles')
    .select('id')
    .in('id', staffIds)
    .eq('salon_id', salonId)
    .eq('active', true);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (staffRows ?? []).map((row) => row.id as string);
}

/**
 * Hent service information
 */
export async function getServiceById(serviceId: string): Promise<ServiceInfo | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('services').select('*').eq('id', serviceId).maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  if (!data) return null;

  return {
    id: data.id as string,
    salonId: data.salon_id as string,
    durationMinutes: data.duration_minutes as number,
    bufferMinutes: data.buffer_minutes as number | undefined
  };
}

/**
 * Hent salon information
 */
export async function getSalonById(salonId: string): Promise<SalonInfo | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('salons').select('*').eq('id', salonId).maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  if (!data) return null;

  return {
    id: data.id as string,
    timezone: data.timezone as string
  };
}

/**
 * Hent staff information
 */
export async function getStaffById(staffId: string): Promise<StaffInfo | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_profiles')
    .select('*')
    .eq('id', staffId)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  if (!data) return null;

  return {
    id: data.id as string,
    salonId: data.salon_id as string
  };
}

/**
 * Tjek om en medarbejder kan udføre en specifik service
 */
export async function canStaffPerformService(staffId: string, serviceId: string): Promise<boolean> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_services')
    .select('staff_id')
    .eq('staff_id', staffId)
    .eq('service_id', serviceId)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data !== null;
}

/**
 * Hent bookinger for specifikke medarbejdere i et tidsinterval
 * Kun aktive bookinger (pending, confirmed, in_progress) returneres
 */
export async function getBookingsInRange(
  staffIds: string[],
  fromUtc: string,
  toUtc: string
): Promise<BookingWindow[]> {
  if (staffIds.length === 0) return [];

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('bookings')
    .select('staff_id, start_time, end_time')
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

/**
 * Hent arbejdstider for specifikke medarbejdere
 */
export async function getStaffWorkingHours(staffIds: string[]): Promise<StaffWorkingHours[]> {
  if (staffIds.length === 0) return [];

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_working_hours')
    .select('*')
    .in('staff_id', staffIds);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map((row) => ({
    staffId: row.staff_id as string,
    day: row.day as BusinessHours['day'],
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    enabled: row.enabled as boolean
  }));
}

/**
 * Hent fri/ferie tid for specifikke medarbejdere i et tidsinterval
 */
export async function getStaffTimeOff(
  staffIds: string[],
  fromUtc: string,
  toUtc: string
): Promise<StaffTimeOff[]> {
  if (staffIds.length === 0) return [];

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('staff_time_off')
    .select('staff_id, start_time, end_time')
    .in('staff_id', staffIds)
    .lt('start_time', toUtc)
    .gt('end_time', fromUtc);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map((row) => ({
    staffId: row.staff_id as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string
  }));
}
