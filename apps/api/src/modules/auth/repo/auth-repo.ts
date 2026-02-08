import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import type { AuthUser, Membership } from '../domain/auth-domain.js';

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  primary_salon_id: string | null;
};

type MembershipRow = {
  id: string;
  salon_id: string;
  role: string;
  active: boolean;
  salons?: {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    locale: string;
    salon_type: string | null;
    currency: string;
    timezone: string;
    cancellation_window_minutes: number;
  }[] | null;
};

export const authRepo = {
  async upsertUser(input: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    phone?: string | null;
  }): Promise<AuthUser> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('users')
      .upsert(
        {
          id: input.id,
          email: input.email ?? null,
          full_name: input.fullName ?? null,
          phone: input.phone ?? null
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }

    return mapUserRow(data as UserRow);
  },

  async getUserById(userId: string): Promise<AuthUser | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }

    return data ? mapUserRow(data as UserRow) : null;
  },

  async provisionSalonForUser(input: {
    userId: string;
    email?: string | null;
    fullName?: string | null;
    phone?: string | null;
  }): Promise<string> {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('provision_salon_for_user', {
      p_user_id: input.userId,
      p_email: input.email ?? null,
      p_full_name: input.fullName ?? null,
      p_phone: input.phone ?? null
    });

    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }

    if (!data) {
      throw httpError(500, 'PROVISION_FAILED', 'Failed to provision salon for user.');
    }

    return data as string;
  },

  async getMembershipsByUserId(userId: string): Promise<Membership[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('memberships')
      .select(
        'id, salon_id, role, active, salons(id, name, slug, status, locale, salon_type, currency, timezone, cancellation_window_minutes)'
      )
      .eq('user_id', userId);

    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }

    return (data ?? []).map((row) => mapMembershipRow(row as unknown as MembershipRow));
  },

  async setPrimarySalon(userId: string, salonId: string): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client
      .from('users')
      .update({ primary_salon_id: salonId })
      .eq('id', userId);

    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }
  },

  async setPrimarySalonIfMissing(userId: string, salonId: string): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client
      .from('users')
      .update({ primary_salon_id: salonId })
      .eq('id', userId)
      .is('primary_salon_id', null);

    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }
  },

  async upsertMembership(input: {
    salonId: string;
    userId: string;
    role: Membership['role'];
    active?: boolean;
  }): Promise<void> {
    const client = getSupabaseClient();
    const { error } = await client
      .from('memberships')
      .upsert(
        {
          salon_id: input.salonId,
          user_id: input.userId,
          role: input.role,
          active: input.active ?? true
        },
        { onConflict: 'salon_id,user_id' }
      );

    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }
  }
};

function mapUserRow(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    primarySalonId: row.primary_salon_id
  };
}

function mapMembershipRow(row: MembershipRow): Membership {
  const salon = row.salons?.[0];
  return {
    id: row.id,
    salonId: row.salon_id,
    role: row.role as Membership['role'],
    active: row.active,
    salon: salon
      ? {
          id: salon.id,
          name: salon.name,
          slug: salon.slug,
          status: salon.status as 'draft' | 'active' | undefined,
          locale: salon.locale,
          salonType: salon.salon_type,
          currency: salon.currency,
          timezone: salon.timezone,
          cancellationWindowMinutes: salon.cancellation_window_minutes
        }
      : undefined
  };
}
