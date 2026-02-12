import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import {
  validateString,
  validateOptionalString,
  validateBoolean,
  validateEnum,
  validateNumber,
} from '../../../shared/validation.js';
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
  salons?:
    | {
        id: string;
        name: string;
        slug: string | null;
        status: string;
        locale: string;
        salon_type: string | null;
        currency: string;
        timezone: string;
        cancellation_window_minutes: number;
      }[]
    | null;
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
          phone: input.phone ?? null,
        },
        { onConflict: 'id' },
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
    const { data, error } = await client.from('users').select('*').eq('id', userId).maybeSingle();

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
    role?: 'owner' | 'admin' | 'staff';
  }): Promise<string> {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('provision_salon_for_user', {
      p_user_id: input.userId,
      p_email: input.email ?? null,
      p_full_name: input.fullName ?? null,
      p_phone: input.phone ?? null,
      p_role: input.role ?? 'owner',
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
        'id, salon_id, role, active, salons(id, name, slug, status, locale, salon_type, currency, timezone, cancellation_window_minutes, stripe_account_id, stripe_details_submitted, stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarding_completed_at)',
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
    const { error } = await client.from('memberships').upsert(
      {
        salon_id: input.salonId,
        user_id: input.userId,
        role: input.role,
        active: input.active ?? true,
      },
      { onConflict: 'salon_id,user_id' },
    );

    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }
  },

  async isPlatformAdmin(userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    const { data: rpcData, error: rpcError } = await client.rpc('is_platform_admin', {
      p_user_id: userId,
    });

    if (rpcError) {
      const message = rpcError.message?.toLowerCase?.() ?? '';
      const missingFn =
        rpcError.code === 'PGRST202' ||
        message.includes('is_platform_admin') ||
        message.includes('function');
      if (!missingFn) {
        throw httpError(500, 'DATABASE_ERROR', rpcError.message, { details: rpcError.details });
      }
    } else if (typeof rpcData === 'boolean') {
      return rpcData;
    }

    const { data, error } = await client
      .from('platform_admins')
      .select('id')
      .eq('user_id', userId)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      const message = error.message?.toLowerCase?.() ?? '';
      if (error.code === '42P01' || message.includes('platform_admins')) {
        return false;
      }
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }

    return !!data;
  },
};

function mapUserRow(row: Record<string, unknown>): AuthUser {
  return {
    id: validateString(row.id, 'id'),
    email: validateOptionalString(row.email, 'email'),
    fullName: validateOptionalString(row.full_name, 'full_name'),
    phone: validateOptionalString(row.phone, 'phone'),
    primarySalonId: validateOptionalString(row.primary_salon_id, 'primary_salon_id'),
  };
}

function mapMembershipRow(row: Record<string, unknown>): Membership {
  const salonsField = row.salons as unknown;
  const salon = Array.isArray(salonsField)
    ? (salonsField[0] as Record<string, unknown> | undefined)
    : (salonsField as Record<string, unknown> | undefined);
  const validRoles = ['owner', 'admin', 'staff'] as const;
  return {
    id: validateString(row.id, 'id'),
    salonId: validateString(row.salon_id, 'salon_id'),
    role: validateEnum(row.role as string, 'role', validRoles),
    active: validateBoolean(row.active, 'active'),
    salon: salon
      ? {
          id: validateString(salon.id, 'salon.id'),
          name: validateString(salon.name, 'salon.name'),
          slug: validateOptionalString(salon.slug, 'salon.slug'),
          status:
            (validateOptionalString(salon.status, 'salon.status') as 'draft' | 'active' | null) ??
            undefined,
          locale: validateString(salon.locale, 'salon.locale'),
          salonType: validateOptionalString(salon.salon_type, 'salon.salon_type'),
          currency: validateString(salon.currency, 'salon.currency'),
          timezone: validateString(salon.timezone, 'salon.timezone'),
          cancellationWindowMinutes: validateNumber(
            salon.cancellation_window_minutes,
            'salon.cancellation_window_minutes',
          ),
          stripeAccountId: validateOptionalString(
            salon.stripe_account_id,
            'salon.stripe_account_id',
          ),
          stripeDetailsSubmitted: salon.stripe_details_submitted as boolean | undefined,
          stripeChargesEnabled: salon.stripe_charges_enabled as boolean | undefined,
          stripePayoutsEnabled: salon.stripe_payouts_enabled as boolean | undefined,
          stripeOnboardingCompletedAt: validateOptionalString(
            salon.stripe_onboarding_completed_at,
            'salon.stripe_onboarding_completed_at',
          ),
          stripeConnectState: validateOptionalString(
            salon.stripe_connect_state,
            'salon.stripe_connect_state',
          ),
          stripeConnectStateExpiresAt: validateOptionalString(
            salon.stripe_connect_state_expires_at,
            'salon.stripe_connect_state_expires_at',
          ),
        }
      : undefined,
  };
}
