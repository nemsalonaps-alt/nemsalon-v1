-- Realistisk seed data med auth links
-- Forudsætter at disse 4 auth brugere findes i Supabase:
--
-- platformadmin@gmail.com | 84b565e6-e67a-45be-9d97-23a5c0d91982
-- salonowner@gmail.com     | 31eb1caa-2668-4cfd-9983-ab8ad44b3a7f  
-- ansat@gmail.com          | ebff70d8-c6c1-4056-9854-345c06572ab2
-- kunde@gmail.com          | f50b1cb0-3206-4209-8621-a1edcbd70ba3

do $$
declare
  v_salon_id uuid;
  v_owner_id uuid := '31eb1caa-2668-4cfd-9983-ab8ad44b3a7f';
  v_staff_user_id uuid := 'ebff70d8-c6c1-4056-9854-345c06572ab2';
  v_customer_user_id uuid := 'f50b1cb0-3206-4209-8621-a1edcbd70ba3';
  v_staff_id uuid;
  v_customer_id uuid;
  v_service_klip uuid;
  v_service_farve uuid;
  v_service_behandling uuid;
  v_booking1 uuid;
  v_booking2 uuid;
  v_booking3 uuid;
begin
  -- ==========================================
  -- 1. PLATFORM ADMIN (system niveau)
  -- ==========================================
  insert into users (id, email, full_name, phone)
  values (
    '84b565e6-e67a-45be-9d97-23a5c0d91982',
    'platformadmin@gmail.com',
    'Platform Administrator',
    '+45 00 00 00 00'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        phone = excluded.phone;

  -- ==========================================
  -- 2. SALON + OWNER (Hårgalleriet)
  -- ==========================================
  -- Bruger provision_salon_for_user til at skabe salon + owner relation
  -- Bemærk: Dette opretter også en membership med rolle 'owner'
  perform provision_salon_for_user(
    v_owner_id,
    'salonowner@gmail.com',
    'Mette Nielsen',
    '+45 20 12 34 56'
  );

  -- Hent salon ID (blev oprettet af provision_salon_for_user)
  select primary_salon_id into v_salon_id
  from users
  where id = v_owner_id;

  -- Opdater salon med realistiske detaljer
  update salons
  set 
    name = 'Hårgalleriet',
    slug = 'haargalleriet',
    timezone = 'Europe/Copenhagen',
    locale = 'da-DK',
    currency = 'DKK',
    status = 'active',
    phone = '+45 35 24 15 85',
    email = 'kontakt@haargalleriet.dk',
    address_line1 = 'Østerbrogade 45',
    city = 'København',
    postal_code = '2100',
    country = 'DK'
  where id = v_salon_id;

  -- ==========================================
  -- 3. STAFF (Tina, frisør)
  -- ==========================================
  -- Opret users record for staff
  insert into users (id, email, full_name, phone)
  values (
    v_staff_user_id,
    'ansat@gmail.com',
    'Tina Pedersen',
    '+45 40 55 67 89'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        phone = excluded.phone;

  -- Opret membership (staff rolle)
  insert into memberships (salon_id, user_id, role, active)
  values (v_salon_id, v_staff_user_id, 'staff', true)
  on conflict (salon_id, user_id) do update
    set role = 'staff', active = true;

  -- Opret staff_profile (linket til users via user_id)
  insert into staff_profiles (salon_id, user_id, display_name, role, email, phone, active)
  values (
    v_salon_id,
    v_staff_user_id,
    'Tina',
    'staff',
    'ansat@gmail.com',
    '+45 40 55 67 89',
    true
  )
  on conflict (salon_id, user_id) do update
    set display_name = excluded.display_name,
        active = excluded.active
  returning id into v_staff_id;

  -- Staff arbejdstider (man-fre 9-17)
  insert into staff_working_hours (staff_id, day, start_time, end_time, enabled)
  values
    (v_staff_id, 'mon', '09:00', '17:00', true),
    (v_staff_id, 'tue', '09:00', '17:00', true),
    (v_staff_id, 'wed', '09:00', '17:00', true),
    (v_staff_id, 'thu', '09:00', '17:00', true),
    (v_staff_id, 'fri', '09:00', '17:00', true),
    (v_staff_id, 'sat', '10:00', '14:00', false),
    (v_staff_id, 'sun', '09:00', '17:00', false)
  on conflict (staff_id, day) do update
    set start_time = excluded.start_time,
        end_time = excluded.end_time,
        enabled = excluded.enabled;

  -- ==========================================
  -- 4. SERVICES (3 almindelige behandlinger)
  -- ==========================================
  insert into services (salon_id, name, description, duration_minutes, buffer_minutes, price_amount, currency, active)
  values (
    v_salon_id,
    'Dameklip',
    'Inklusiv vask og styling',
    60,
    15,
    45000,
    'DKK',
    true
  )
  returning id into v_service_klip;

  insert into services (salon_id, name, description, duration_minutes, buffer_minutes, price_amount, currency, active)
  values (
    v_salon_id,
    'Hårfarvning',
    'Bundfarvning eller helfarvning',
    120,
    30,
    85000,
    'DKK',
    true
  )
  returning id into v_service_farve;

  insert into services (salon_id, name, description, duration_minutes, buffer_minutes, price_amount, currency, active)
  values (
    v_salon_id,
    'Herreklip',
    'Inklusiv vask',
    30,
    15,
    29900,
    'DKK',
    true
  )
  returning id into v_service_behandling;

  -- Link staff til services (Tina kan klippe og farve)
  insert into staff_services (staff_id, service_id)
  values 
    (v_staff_id, v_service_klip),
    (v_staff_id, v_service_farve),
    (v_staff_id, v_service_behandling)
  on conflict (staff_id, service_id) do nothing;

  -- ==========================================
  -- 5. CUSTOMER (Lisa, har auth account)
  -- ==========================================
  -- Opret users record for customer (bruges til login)
  insert into users (id, email, full_name, phone)
  values (
    v_customer_user_id,
    'kunde@gmail.com',
    'Lisa Jensen',
    '+45 28 34 56 78'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        phone = excluded.phone;

  -- Opret customer record (linket til salon og auth)
  insert into customers (salon_id, name, email, phone, notes)
  values (
    v_salon_id,
    'Lisa Jensen',
    'kunde@gmail.com',
    '+45 28 34 56 78',
    'Stamkunde - foretrækker eftermiddagstider'
  )
  returning id into v_customer_id;

  -- ==========================================
  -- 6. BOOKINGER (1 kommende, 2 afsluttede)
  -- ==========================================
  -- Booking 1: Kommende (i morgen, confirmed)
  insert into bookings (
    salon_id, customer_id, staff_id, service_id,
    start_time, end_time, status, total_amount, currency, notes
  )
  values (
    v_salon_id,
    v_customer_id,
    v_staff_id,
    v_service_klip,
    now() + interval '1 day' + interval '10 hours',
    now() + interval '1 day' + interval '11 hours',
    'confirmed',
    45000,
    'DKK',
    'Fast tid - hver 6. uge'
  )
  returning id into v_booking1;

  -- Booking 2: Afsluttet for 2 uger siden
  insert into bookings (
    salon_id, customer_id, staff_id, service_id,
    start_time, end_time, status, total_amount, currency, notes
  )
  values (
    v_salon_id,
    v_customer_id,
    v_staff_id,
    v_service_farve,
    now() - interval '14 days' + interval '13 hours',
    now() - interval '14 days' + interval '15 hours',
    'completed',
    85000,
    'DKK',
    'Bundfarvning - mørkere nuance'
  )
  returning id into v_booking2;

  -- Booking 3: Afsluttet for 6 uger siden
  insert into bookings (
    salon_id, customer_id, staff_id, service_id,
    start_time, end_time, status, total_amount, currency, notes
  )
  values (
    v_salon_id,
    v_customer_id,
    v_staff_id,
    v_service_klip,
    now() - interval '42 days' + interval '10 hours',
    now() - interval '42 days' + interval '11 hours',
    'completed',
    45000,
    'DKK',
    'Regelmæssig klipning'
  )
  returning id into v_booking3;

  -- ==========================================
  -- 7. BUSINESS HOURS (for salonen)
  -- ==========================================
  -- Update existing hours created by provision_salon_for_user
  update salon_business_hours
  set 
    start_time = '09:00',
    end_time = '17:00',
    enabled = true
  where salon_id = v_salon_id and day in ('mon', 'tue', 'wed', 'thu', 'fri');

  update salon_business_hours
  set 
    start_time = '10:00',
    end_time = '14:00',
    enabled = true
  where salon_id = v_salon_id and day = 'sat';

  -- ==========================================
  -- 8. SUMMARY OUTPUT
  -- ==========================================
  raise notice '============================================';
  raise notice 'SEED DATA CREATED SUCCESSFULLY';
  raise notice '============================================';
  raise notice 'Salon: Hårgalleriet (%)', v_salon_id;
  raise notice 'Owner: Mette Nielsen (%)', v_owner_id;
  raise notice 'Staff: Tina Pedersen (%)', v_staff_id;
  raise notice 'Customer: Lisa Jensen (%)', v_customer_id;
  raise notice 'Services: Dameklip, Hårfarvning, Herreklip';
  raise notice 'Bookings: 1 kommende, 2 afsluttede';
  raise notice '============================================';

end $$;
