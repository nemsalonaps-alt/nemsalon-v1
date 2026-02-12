import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const devStaffId = process.env.DEV_STAFF_ID ?? '00000000-0000-0000-0000-000000000002';

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for E2E tests');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

export async function setPlatformAdmin(userId: string, email: string, active: boolean) {
  try {
    if (active) {
      const { error } = await supabaseAdmin
        .from('platform_admins')
        .upsert({ user_id: userId, email, active: true }, { onConflict: 'user_id' });
      if (error) throw error;
      const { data: verify, error: verifyError } = await supabaseAdmin
        .from('platform_admins')
        .select('user_id, active')
        .eq('user_id', userId)
        .maybeSingle();
      if (verifyError) throw verifyError;
      if (!verify?.active) {
        throw new Error('Platform admin flag not applied.');
      }
      return;
    }

    const { error } = await supabaseAdmin.from('platform_admins').delete().eq('user_id', userId);
    if (error) throw error;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'PGRST205'
    ) {
      // Table not available in schema cache; rely on PLATFORM_ADMIN_EMAILS fallback instead.
      return;
    }
    throw error;
  }
}

async function getDevSalon() {
  const { data, error } = await supabaseAdmin
    .from('salons')
    .select('id, slug, name')
    .eq('slug', 'dev-salon')
    .maybeSingle();
  if (error || !data) throw error ?? new Error('Dev salon not found');
  return data;
}

async function getDevService(salonId: string) {
  const { data, error } = await supabaseAdmin
    .from('services')
    .select('id, duration_minutes')
    .eq('salon_id', salonId)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) throw error ?? new Error('Dev service not found');
  return data;
}

async function getDevStaff(salonId: string) {
  const { data: preferred, error: preferredError } = await supabaseAdmin
    .from('staff_profiles')
    .select('id')
    .eq('salon_id', salonId)
    .eq('user_id', devStaffId)
    .maybeSingle();
  if (preferredError) throw preferredError;
  if (preferred) return preferred;

  const { data, error } = await supabaseAdmin
    .from('staff_profiles')
    .select('id')
    .eq('salon_id', salonId)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) throw error ?? new Error('Dev staff not found');
  return data;
}

async function getCustomerByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id, salon_id, email')
    .eq('email', email)
    .maybeSingle();
  if (error || !data) throw error ?? new Error('Customer not found');
  return data;
}

export async function createCustomerBooking(params: {
  customerEmail: string;
  startTime: Date;
  durationMinutes?: number;
  status?: 'pending' | 'confirmed' | 'cancelled';
}) {
  const salon = await getDevSalon();
  const customer = await getCustomerByEmail(params.customerEmail);
  const staff = await getDevStaff(salon.id);
  const service = await getDevService(salon.id);
  const duration = params.durationMinutes ?? service.duration_minutes ?? 30;
  const start = params.startTime;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const { error: staffServiceError } = await supabaseAdmin
    .from('staff_services')
    .upsert(
      { staff_id: staff.id, service_id: service.id },
      { onConflict: 'staff_id,service_id' },
    );

  if (staffServiceError) {
    throw staffServiceError;
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      salon_id: salon.id,
      customer_id: customer.id,
      staff_id: staff.id,
      service_id: service.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: params.status ?? 'confirmed',
      total_amount: 29900,
      currency: 'DKK',
    })
    .select('id, start_time, end_time')
    .single();

  if (error || !data) throw error ?? new Error('Failed to create booking');
  return data;
}

export async function createStaffTimeOffEntry(params: {
  startTime: Date;
  endTime: Date;
  reason?: string;
}) {
  const salon = await getDevSalon();
  const staff = await getDevStaff(salon.id);

  const { data, error } = await supabaseAdmin
    .from('staff_time_off')
    .insert({
      salon_id: salon.id,
      staff_id: staff.id,
      start_time: params.startTime.toISOString(),
      end_time: params.endTime.toISOString(),
      reason: params.reason ?? null,
    })
    .select('id, start_time, end_time, reason')
    .single();

  if (error || !data) throw error ?? new Error('Failed to create staff time off');
  return data;
}
