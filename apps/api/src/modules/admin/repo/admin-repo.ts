import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';

export type AdminOverview = {
  salons: number;
  users: number;
  bookings: number;
  payments: number;
};

async function countRows(table: string) {
  const client = getSupabaseClient();
  const { count, error } = await client.from(table).select('id', { count: 'exact', head: true });
  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }
  return count ?? 0;
}

export const adminRepo = {
  async getOverview(): Promise<AdminOverview> {
    const [salons, users, bookings, payments] = await Promise.all([
      countRows('salons'),
      countRows('users'),
      countRows('bookings'),
      countRows('payments')
    ]);

    return { salons, users, bookings, payments };
  }
};
