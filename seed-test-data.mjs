#!/usr/bin/env node
/**
 * Seed test data for notification flow test
 * Uses Supabase SDK directly - no SQL needed
 * 
 * Run with: node seed-test-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load env from API .env
const envPath = resolve(process.cwd(), 'apps/api/.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const supabaseUrl = env.SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/api/.env');
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
      price: 29900,
      currency: 'DKK',
      active: true
    }, { onConflict: 'id' });

    if (serviceError) throw new Error(`Service: ${serviceError.message}`);
    console.log(green('✓ Service created'));

    // 3. Create staff
    const { error: staffError } = await supabase.from('staff_profiles').upsert({
      id: STAFF_ID,
      salon_id: SALON_ID,
      name: 'Anna Frisør',
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
      const { error: hoursError } = await supabase.from('business_hours').upsert({
        salon_id: SALON_ID,
        day_of_week: h.day,
        enabled: h.enabled,
        start_time: h.start,
        end_time: h.end
      }, { onConflict: 'salon_id,day_of_week' });
      
      if (hoursError) throw new Error(`Business hours day ${h.day}: ${hoursError.message}`);
    }
    console.log(green('✓ Business hours created'));

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
    console.log(`\nYou can now run: node test-notification-flow.mjs`);

  } catch (error) {
    console.error(`\n${red('✗ Failed:')} ${error.message}`);
    process.exit(1);
  }
}

seed();
