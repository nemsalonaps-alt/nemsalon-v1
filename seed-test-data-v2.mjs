#!/usr/bin/env node
/**
 * Seed test data for notification flow test
 * 
 * Run with:
 *   SUPABASE_URL=http://localhost:54321 SUPABASE_SERVICE_ROLE_KEY=xxx node seed-test-data.mjs
 * 
 * Or export vars first:
 *   export SUPABASE_URL=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 *   node seed-test-data.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables:');
  console.error('  SUPABASE_URL - e.g., http://localhost:54321');
  console.error('  SUPABASE_SERVICE_ROLE_KEY - your service role key');
  console.error('');
  console.error('Get these from your Supabase setup or run:');
  console.error('  supabase status');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const SALON_ID = '550e8400-e29b-41d4-a716-446655440000';
const SERVICE_ID = '550e8400-e29b-41d4-a716-446655440001';
const STAFF_ID = '550e8400-e29b-41d4-a716-446655440002';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

async function seed() {
  console.log(yellow('Seeding test data...\n'));
  console.log(`Supabase: ${supabaseUrl}\n`);

  try {
    // 1. Create salon
    const { error: salonError } = await supabase.from('salons').upsert({
      id: SALON_ID,
      name: 'Test Salon København',
      slug: 'test-salon-kbh',
      timezone: 'Europe/Copenhagen',
      locale: 'da-DK',
      currency: 'DKK',
      status: 'active',
      cancellation_window_minutes: 1440,
      salon_type: 'hair_salon'
    }, { onConflict: 'id' });

    if (salonError) throw new Error(`Salon: ${salonError.message}`);
    console.log(green('✓ Salon created'));

    // 2. Create service
    const { error: serviceError } = await supabase.from('services').upsert({
      id: SERVICE_ID,
      salon_id: SALON_ID,
      name: 'Dameklip',
      duration_minutes: 30,
      buffer_minutes: 0,
      price_amount: 29900,
      currency: 'DKK',
      active: true
    }, { onConflict: 'id' });

    if (serviceError) throw new Error(`Service: ${serviceError.message}`);
    console.log(green('✓ Service created'));

    // 3. Create staff
    const { error: staffError } = await supabase.from('staff_profiles').upsert({
      id: STAFF_ID,
      salon_id: SALON_ID,
      display_name: 'Anna Frisør',
      email: 'anna@test-salon.dk',
      role: 'staff',
      active: true
    }, { onConflict: 'id' });

    if (staffError) throw new Error(`Staff: ${staffError.message}`);
    console.log(green('✓ Staff created'));

    // 4. Link staff to service
    const { error: linkError } = await supabase.from('staff_services').upsert({
      staff_id: STAFF_ID,
      service_id: SERVICE_ID
    }, { onConflict: 'staff_id,service_id' });

    if (linkError) throw new Error(`Staff-Service link: ${linkError.message}`);
    console.log(green('✓ Staff linked to service'));

    // 5. Create business hours (Mon-Fri 9-17, Sat 9-14)
    const hours = [
      { day: 1, enabled: true, start: '09:00', end: '17:00' },
      { day: 2, enabled: true, start: '09:00', end: '17:00' },
      { day: 3, enabled: true, start: '09:00', end: '17:00' },
      { day: 4, enabled: true, start: '09:00', end: '17:00' },
      { day: 5, enabled: true, start: '09:00', end: '17:00' },
      { day: 6, enabled: true, start: '09:00', end: '14:00' },
      { day: 0, enabled: false, start: null, end: null }
    ];

    for (const h of hours) {
      // Skip disabled days - they don't need entries
      if (!h.enabled) continue;
      
      const { error: hoursError } = await supabase.from('salon_business_hours').upsert({
        salon_id: SALON_ID,
        day: h.day === 0 ? 'sun' : h.day === 1 ? 'mon' : h.day === 2 ? 'tue' : h.day === 3 ? 'wed' : h.day === 4 ? 'thu' : h.day === 5 ? 'fri' : 'sat',
        enabled: h.enabled,
        start_time: h.start,
        end_time: h.end
      }, { onConflict: 'salon_id,day' });
      
      if (hoursError) throw new Error(`Business hours day ${h.day}: ${hoursError.message}`);
    }
    console.log(green('✓ Business hours created'));

    // 6. Create staff working hours (same as salon hours)
    const staffHours = [
      { day: 'mon', start: '09:00', end: '17:00' },
      { day: 'tue', start: '09:00', end: '17:00' },
      { day: 'wed', start: '09:00', end: '17:00' },
      { day: 'thu', start: '09:00', end: '17:00' },
      { day: 'fri', start: '09:00', end: '17:00' },
      { day: 'sat', start: '09:00', end: '14:00' }
    ];

    for (const h of staffHours) {
      const { error: staffHoursError } = await supabase.from('staff_working_hours').upsert({
        staff_id: STAFF_ID,
        day: h.day,
        enabled: true,
        start_time: h.start,
        end_time: h.end
      }, { onConflict: 'staff_id,day' });
      
      if (staffHoursError) throw new Error(`Staff hours ${h.day}: ${staffHoursError.message}`);
    }
    console.log(green('✓ Staff working hours created'));

    // Verify
    const { data: salon, error: verifyError } = await supabase
      .from('salons')
      .select('name, slug, status')
      .eq('id', SALON_ID)
      .single();

    if (verifyError || !salon) {
      throw new Error('Verification failed - could not read back salon');
    }

    console.log(`\n${green('✓ Test data ready!')}`);
    console.log(`\nSalon: ${salon.name}`);
    console.log(`Slug: ${salon.slug}`);
    console.log(`Status: ${salon.status}`);
    console.log(`\nNext: node test-notification-flow.mjs`);

  } catch (error) {
    console.error(`\n${red('✗ Failed:')} ${error.message}`);
    process.exit(1);
  }
}

seed();
