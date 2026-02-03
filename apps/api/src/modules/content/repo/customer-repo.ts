import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { Customer } from '../domain/content-domain.js';

export type CustomerInsert = {
  salonId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export async function createCustomer(input: CustomerInsert): Promise<Customer> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('customers')
    .insert({
      salon_id: input.salonId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null
    })
    .select('*')
    .single();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return mapCustomerRow(data);
}

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return data ? mapCustomerRow(data) : null;
}

export async function getCustomersByIds(customerIds: string[]): Promise<Customer[]> {
  if (customerIds.length === 0) return [];
  const client = getSupabaseClient();
  const { data, error } = await client.from('customers').select('*').in('id', customerIds);

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapCustomerRow);
}

export async function listCustomersBySalon(input: {
  salonId: string;
  limit?: number;
}): Promise<Customer[]> {
  const client = getSupabaseClient();
  let query = client.from('customers').select('*').eq('salon_id', input.salonId).order('name', { ascending: true });
  if (input.limit) {
    query = query.limit(input.limit);
  }
  const { data, error } = await query;

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  return (data ?? []).map(mapCustomerRow);
}

function mapCustomerRow(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    salonId: row.salon_id as string,
    name: row.name as string,
    email: row.email as string | null,
    phone: row.phone as string | null,
    notes: row.notes as string | null
  };
}
