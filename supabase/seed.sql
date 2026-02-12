-- Unified Seed - Auth Users + Profiles + Data
-- Opretter auth users OG kobler dem til deres roller
-- Kør i Supabase SQL Editor (kræver service role for auth.users)

do $$
declare
  v_salon_id uuid;
  v_staff_id uuid;
  v_customer_id uuid;
  v_service_klip uuid;
  v_service_farve uuid;
  v_service_behandling uuid;
  v_booking1 uuid;
  v_booking2 uuid;
  v_booking3 uuid;
  
  -- Auth User UUIDs (skal matche dem du har oprettet i Supabase Auth)
  v_platform_admin_id uuid := '84b565e6-e67a-45be-9d97-23a5c0d91982';
  v_owner_id uuid := '31ebc1aa-2668-4cfd-9983-ab8ad44b3a7f';
  v_staff_user_id uuid := 'ebf170d8-c6c1-4056-9854-345c06572ab2';
  v_customer_user_id uuid := 'f50b1cb0-3206-4209-8621-a1edcbd70ba3';
begin
  -- ==========================================
  -- 1. AUTH USERS (hvis de ikke findes)
  -- ==========================================
  -- Bemærk: Passwords skal sættes via Supabase Dashboard → Auth → Users
  -- eller via Auth API. SQL kan ikke sætte passwords.
  
  -- Platform Admin
  insert into auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  values (
    v_platform_admin_id,
    'platformadmin@gmail.com',
    now(),
    now(),
    now(),
    '{"full_name": "Platform Administrator"}'::jsonb
  )
  on conflict do nothing;

  -- Salon Owner
  insert into auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  values (
    v_owner_id,
    'salonowner@gmail.com',
    now(),
    now(),
    now(),
    '{"full_name": "Mette Nielsen"}'::jsonb
  )
  on conflict do nothing;

  -- Staff
  insert into auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  values (
    v_staff_user_id,
    'ansat@gmail.com',
    now(),
    now(),
    now(),
    '{"full_name": "Tina Pedersen"}'::jsonb
  )
  on conflict do nothing;

  -- Customer
  insert into auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
  values (
    v_customer_user_id,
    'kunde@gmail.com',
    now(),
    now(),
    now(),
    '{"full_name": "Lisa Jensen"}'::jsonb
  )
  on conflict do nothing;

  -- ==========================================
  -- 2. PLATFORM ADMIN
  -- ==========================================
  -- Create user record
  insert into users (id, email, full_name, phone)
  values (
    v_platform_admin_id,
    'platformadmin@gmail.com',
    'Platform Administrator',
    '+45 00 00 00 00'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        phone = excluded.phone;

  -- Add to platform_admins table
  insert into platform_admins (user_id, email, active)
  values (
    v_platform_admin_id,
    'platformadmin@gmail.com',
    true
  )
  on conflict (user_id) do update
    set email = excluded.email,
        active = true;

  -- Ensure platform admin has full_name populated
  update users set full_name = 'Platform Administrator' where id = v_platform_admin_id;

  -- ==========================================
  -- 3. SALON + OWNER
  -- ==========================================
  -- Provision salon for owner (opretter salon, membership som owner, business hours)
  perform provision_salon_for_user(
    v_owner_id,
    'salonowner@gmail.com',
    'Mette Nielsen',
    '+45 20 12 34 56',
    'owner'
  );

  -- Hent salon ID
  select primary_salon_id into v_salon_id
  from users
  where id = v_owner_id;

  -- Opdater salon detaljer
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
  -- 4. STAFF (Tina) - NOW AUTOMATIC VIA provision_salon_for_user
  -- ==========================================
  -- Staff profile and membership are now created automatically by provision_salon_for_user
  -- We just need to fetch the staff_id for working hours

  -- Provision salon for staff (creates staff profile and membership automatically)
  perform provision_salon_for_user(
    v_staff_user_id,
    'ansat@gmail.com',
    'Tina Pedersen',
    '+45 40 55 67 89',
    'staff'
  );

  -- Fetch the staff_id that was auto-created
  select id into v_staff_id from staff_profiles where salon_id = v_salon_id and user_id = v_staff_user_id;

  -- Staff working hours (still needed since they're per-staff, not auto-created)
  if v_staff_id is not null then
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
  end if;

  -- Ensure all users have full_name populated (robust backup in case provision didn't set it)
  update users set full_name = 'Mette Nielsen' where id = v_owner_id and (full_name is null or full_name = '');
  update users set full_name = 'Tina Pedersen' where id = v_staff_user_id and (full_name is null or full_name = '');

  -- ==========================================
  -- 5. SERVICES
  -- ==========================================
  -- Tjek først om servicen findes
  select id into v_service_klip from services where salon_id = v_salon_id and name = 'Dameklip';
  if v_service_klip is null then
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
  end if;

  select id into v_service_farve from services where salon_id = v_salon_id and name = 'Hårfarvning';
  if v_service_farve is null then
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
  end if;

  select id into v_service_behandling from services where salon_id = v_salon_id and name = 'Herreklip';
  if v_service_behandling is null then
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
  end if;

  -- Link staff til services
  if v_staff_id is not null then
    insert into staff_services (staff_id, service_id)
    values 
      (v_staff_id, v_service_klip),
      (v_staff_id, v_service_farve),
      (v_staff_id, v_service_behandling)
    on conflict (staff_id, service_id) do nothing;
  end if;

  -- ==========================================
  -- 6. CUSTOMER (Lisa)
  -- ==========================================
  -- Users record
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

  -- Customer record (linket til salon og auth)
  insert into customers (salon_id, user_id, name, email, phone, notes)
  values (
    v_salon_id,
    v_customer_user_id,
    'Lisa Jensen',
    'kunde@gmail.com',
    '+45 28 34 56 78',
    'Stamkunde - foretrækker eftermiddagstider'
  )
  on conflict do nothing
  returning id into v_customer_id;

  -- Hent customer_id hvis den ikke blev indsat
  if v_customer_id is null then
    select id into v_customer_id from customers where salon_id = v_salon_id and user_id = v_customer_user_id;
  end if;

  -- Ensure customer has full_name populated
  update users set full_name = 'Lisa Jensen' where id = v_customer_user_id and (full_name is null or full_name = '');

  -- Ensure roles do not overlap (customer should not have memberships, staff should not be a customer)
  delete from memberships where user_id = v_customer_user_id;
  delete from customers where user_id = v_staff_user_id;

  -- ==========================================
  -- 7. BOOKINGER
  -- ==========================================
  if v_customer_id is not null and v_staff_id is not null then
    -- Booking 1: Kommende
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
  end if;

  -- ==========================================
  -- 8. BUSINESS HOURS
  -- ==========================================
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
  -- 9. SUMMARY
  -- ==========================================
  raise notice '============================================';
  raise notice 'SEED COMPLETED SUCCESSFULLY';
  raise notice '============================================';
  raise notice 'Platform Admin: platformadmin@gmail.com (%)', v_platform_admin_id;
  raise notice 'Owner: salonowner@gmail.com (%)', v_owner_id;
  raise notice 'Staff: ansat@gmail.com (%)', v_staff_user_id;
  raise notice 'Customer: kunde@gmail.com (%)', v_customer_user_id;
  raise notice 'Salon: Hårgalleriet (%)', v_salon_id;
  raise notice 'Services: Dameklip, Hårfarvning, Herreklip';
  raise notice 'Bookings: 1 kommende, 2 afsluttede';
  raise notice '============================================';
  raise notice 'IMPORTANT: Set passwords in Supabase Dashboard';
  raise notice '→ Authentication → Users → [Edit] → Set password';
  raise notice '============================================';

end $$;
