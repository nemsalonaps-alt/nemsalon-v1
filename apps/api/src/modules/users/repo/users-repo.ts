import { getSupabaseClient } from '../../../server/db.js';
import { httpError } from '../../../server/http-error.js';
import { validateString, validateOptionalString } from '../../../shared/validation.js';
import type { SupabaseClient } from '@supabase/supabase-js';

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
      }[]
    | null;
};

export type PlatformUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: 'owner' | 'admin' | 'staff' | 'customer' | null;
  salonId: string | null;
  salonName: string | null;
  salonStatus: string | null;
  createdAt: string;
};

export type UsersListResponse = {
  data: PlatformUser[];
  meta: {
    total: number;
    limit: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
};

export type ListUsersOptions = {
  limit?: number;
  offset?: number;
  query?: string;
  role?: 'owner' | 'admin' | 'staff' | 'customer';
  salonId?: string;
};

function mapUserRow(row: Record<string, unknown>): PlatformUser {
  const memberships = row.memberships as MembershipRow[] | undefined;
  const primaryMembership = memberships?.find((m) => m.active);

  return {
    id: validateString(row.id, 'id'),
    email: validateOptionalString(row.email, 'email'),
    fullName: validateOptionalString(row.full_name, 'full_name'),
    role: (primaryMembership?.role as 'owner' | 'admin' | 'staff' | 'customer' | null) ?? null,
    salonId: primaryMembership?.salon_id ?? null,
    salonName: primaryMembership?.salons?.[0]?.name ?? null,
    salonStatus: primaryMembership?.salons?.[0]?.status ?? null,
    createdAt: validateString(row.created_at, 'created_at'),
  };
}

export const usersRepo = {
  async listUsers(options: ListUsersOptions): Promise<UsersListResponse> {
    const client = getSupabaseClient();
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    // Get platform admin IDs to exclude
    const { data: platformAdmins } = await client
      .from('platform_admins')
      .select('user_id')
      .eq('active', true);
    const platformAdminIds = platformAdmins?.map((a) => a.user_id) ?? [];

    // For customers, query users joined with customers table (customers don't have memberships)
    if (options.role === 'customer') {
      const { data: membershipRows, error: membershipError } = await client
        .from('memberships')
        .select('user_id');
      if (membershipError) {
        throw httpError(500, 'DATABASE_ERROR', membershipError.message, {
          details: membershipError.details,
        });
      }
      const membershipUserIds = (membershipRows ?? [])
        .map((row: { user_id: string | null }) => row.user_id)
        .filter((id): id is string => Boolean(id));
      const excludeUserIds = Array.from(new Set([...platformAdminIds, ...membershipUserIds]));
      return listCustomersQuery(client, options, limit, offset, excludeUserIds);
    }

    // For owner/staff/admin, query users with memberships
    let query = client
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        primary_salon_id,
        created_at,
        memberships!inner(
          id,
          salon_id,
          role,
          active,
          salons!inner(
            id,
            name,
            slug,
            status
          )
        )
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.query) {
      query = query.or(`email.ilike.%${options.query}%,full_name.ilike.%${options.query}%`);
    }

    if (options.role) {
      query = query.eq('memberships.role', options.role);
    }

    if (options.salonId) {
      query = query.eq('memberships.salon_id', options.salonId);
    }

    const { data, error, count } = await query;

    if (error) {
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }

    // Filter out platform admins
    const filteredData = data?.filter((row) => !platformAdminIds.includes(row.id)) ?? [];

    const users = filteredData.map((row) => mapUserRow(row as unknown as Record<string, unknown>));
    const total = count
      ? count -
        Math.min(
          count,
          platformAdminIds.filter((id) => filteredData.some((r) => r.id === id)).length,
        )
      : 0;
    const hasMore = offset + limit < total;
    const nextOffset = hasMore ? offset + limit : null;

    return {
      data: users,
      meta: {
        total,
        limit,
        hasMore,
        nextOffset,
      },
    };
  },

  async getUserById(userId: string): Promise<PlatformUser | null> {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        primary_salon_id,
        created_at,
        memberships(
          id,
          salon_id,
          role,
          active,
          salons(
            id,
            name,
            slug,
            status
          )
        )
      `,
      )
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }

    return mapUserRow(data as unknown as Record<string, unknown>);
  },

  async getUserByEmail(email: string): Promise<PlatformUser | null> {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        primary_salon_id,
        created_at,
        memberships(
          id,
          salon_id,
          role,
          active,
          salons(
            id,
            name,
            slug,
            status
          )
        )
      `,
      )
      .ilike('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
    }

    return mapUserRow(data as unknown as Record<string, unknown>);
  },
};

async function listCustomersQuery(
  client: SupabaseClient,
  options: ListUsersOptions,
  limit: number,
  offset: number,
  excludeUserIds: string[],
): Promise<UsersListResponse> {
  let query = client
    .from('customers')
    .select(
      `
      id,
      user_id,
      salon_id,
      name,
      email,
      created_at,
      salons(
        id,
        name,
        slug,
        status
      )
    `,
      { count: 'exact' },
    )
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.query) {
    query = query.or(`email.ilike.%${options.query}%,name.ilike.%${options.query}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw httpError(500, 'DATABASE_ERROR', error.message, { details: error.details });
  }

  const filteredData =
    data?.filter((row) => {
      const userId = (row as { user_id?: string | null }).user_id ?? null;
      return userId && !excludeUserIds.includes(userId);
    }) ?? [];

  const users = filteredData.map((row: Record<string, unknown>) => {
    const userId = validateString(row.user_id, 'user_id');
    const salon = (row.salons as unknown[] | null)?.[0] as Record<string, unknown> | undefined;
    return {
      id: userId,
      email: validateOptionalString(row.email, 'email'),
      fullName: validateOptionalString(row.name, 'name'),
      role: 'customer' as const,
      salonId: validateOptionalString(row.salon_id, 'salon_id'),
      salonName: salon ? validateOptionalString(salon.name, 'salon.name') : null,
      salonStatus: salon
        ? ((validateOptionalString(salon.status, 'salon.status') as 'draft' | 'active' | null) ??
            null)
        : null,
      createdAt: validateString(row.created_at, 'created_at'),
    };
  });

  const excludedCount = filteredData.length === (data ?? []).length
    ? 0
    : (data ?? []).reduce((acc, row) => {
        const userId = (row as { user_id?: string | null }).user_id ?? null;
        return userId && excludeUserIds.includes(userId) ? acc + 1 : acc;
      }, 0);
  const total = Math.max(0, (count ?? 0) - excludedCount);
  const hasMore = offset + limit < total;
  const nextOffset = hasMore ? offset + limit : null;

  return {
    data: users,
    meta: {
      total,
      limit,
      hasMore,
      nextOffset,
    },
  };
}
