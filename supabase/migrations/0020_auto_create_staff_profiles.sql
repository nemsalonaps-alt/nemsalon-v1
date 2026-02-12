-- Migration: Auto-create staff profiles in provision_salon_for_user
-- This ensures users get a staff profile automatically when logging in
-- Run this migration before seed.sql

-- Step 1: Update the provision_salon_for_user function to create staff profiles
create or replace function provision_salon_for_user(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_phone text
)
returns uuid as $$
declare
  v_salon_id uuid;
  v_display_name text;
begin
  -- Insert/update user record
  insert into users (id, email, full_name, phone)
  values (p_user_id, p_email, p_full_name, p_phone)
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        phone = excluded.phone;

  -- Get primary salon ID
  select primary_salon_id
    into v_salon_id
    from users
   where id = p_user_id
   for update;

  -- If no primary salon, find existing membership
  if v_salon_id is null then
    select salon_id
      into v_salon_id
      from memberships
     where user_id = p_user_id
     order by created_at desc
     limit 1;

    if v_salon_id is not null then
      update users
         set primary_salon_id = v_salon_id
       where id = p_user_id;
    end if;
  end if;

  -- Create new salon if no salon found
  if v_salon_id is null then
    insert into salons (name)
    values ('New salon')
    returning id into v_salon_id;

    update salons
       set slug = concat_ws(
         '-',
         trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')),
         substring(v_salon_id::text from 1 for 6)
       )
     where id = v_salon_id
       and (slug is null or slug = '');

    -- Owner membership
    insert into memberships (salon_id, user_id, role, active)
    values (v_salon_id, p_user_id, 'owner', true)
    on conflict (salon_id, user_id) do nothing;

    -- Owner staff profile
    insert into staff_profiles (salon_id, user_id, display_name, role, email, phone, active)
    select
      v_salon_id,
      p_user_id,
      coalesce(p_full_name, 'Owner'),
      'owner',
      p_email,
      p_phone,
      true
    where not exists (
      select 1 from staff_profiles
      where salon_id = v_salon_id and user_id = p_user_id
    );

    update users
       set primary_salon_id = v_salon_id
     where id = p_user_id;

    -- Business hours
    insert into salon_business_hours (salon_id, day, start_time, end_time, enabled)
    values
      (v_salon_id, 'mon', '09:00', '17:00', true),
      (v_salon_id, 'tue', '09:00', '17:00', true),
      (v_salon_id, 'wed', '09:00', '17:00', true),
      (v_salon_id, 'thu', '09:00', '17:00', true),
      (v_salon_id, 'fri', '09:00', '17:00', true),
      (v_salon_id, 'sat', '09:00', '17:00', false),
      (v_salon_id, 'sun', '09:00', '17:00', false)
    on conflict (salon_id, day) do nothing;

  else
    -- User joining existing salon - create staff membership and profile
    insert into memberships (salon_id, user_id, role, active)
    values (v_salon_id, p_user_id, 'staff', true)
    on conflict (salon_id, user_id) do update
      set active = true;

    -- Staff profile
    insert into staff_profiles (salon_id, user_id, display_name, role, email, phone, active)
    select
      v_salon_id,
      p_user_id,
      coalesce(p_full_name, 'Staff Member'),
      'staff',
      p_email,
      p_phone,
      true
    where not exists (
      select 1 from staff_profiles
      where salon_id = v_salon_id and user_id = p_user_id
    );
  end if;

  return v_salon_id;
end;
$$ language plpgsql;

-- Step 2: Add unique constraint if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'idx_staff_profiles_salon_user'
  ) then
    create unique index if not exists idx_staff_profiles_salon_user 
    on staff_profiles(salon_id, user_id) where user_id is not null;
  end if;
end $$;

-- Step 3: Update existing users without staff profiles (run once)
-- This fixes any users who logged in before this migration
do $$
declare
  rec record;
begin
  for rec in
    select distinct u.id as user_id, u.primary_salon_id as salon_id, u.full_name, u.email, u.phone, m.role
    from users u
    join memberships m on u.id = m.user_id
    left join staff_profiles sp on m.salon_id = sp.salon_id and u.id = sp.user_id
    where sp.id is null
      and u.primary_salon_id is not null
  loop
    insert into staff_profiles (salon_id, user_id, display_name, role, email, phone, active)
    values (
      rec.salon_id,
      rec.user_id,
      coalesce(rec.full_name, case when rec.role = 'owner' then 'Owner' else 'Staff Member' end),
      rec.role,
      rec.email,
      rec.phone,
      true
    );
  end loop;
end $$;

-- Step 4: Create working hours for any staff profiles missing them
do $$
declare
  rec record;
begin
  for rec in
    select distinct sp.id as staff_id
    from staff_profiles sp
    left join staff_working_hours swh on sp.id = swh.staff_id
    where swh.id is null
  loop
    insert into staff_working_hours (staff_id, day, start_time, end_time, enabled)
    values
      (rec.staff_id, 'mon', '09:00', '17:00', true),
      (rec.staff_id, 'tue', '09:00', '17:00', true),
      (rec.staff_id, 'wed', '09:00', '17:00', true),
      (rec.staff_id, 'thu', '09:00', '17:00', true),
      (rec.staff_id, 'fri', '09:00', '17:00', true),
      (rec.staff_id, 'sat', '10:00', '14:00', false),
      (rec.staff_id, 'sun', '09:00', '17:00', false)
    on conflict (staff_id, day) do update
      set start_time = excluded.start_time,
          end_time = excluded.end_time,
          enabled = excluded.enabled;
  end loop;
end $$;
