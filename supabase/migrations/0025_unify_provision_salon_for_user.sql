-- Ensure a single provision_salon_for_user function signature (with role)

drop function if exists provision_salon_for_user(uuid, text, text, text);

create or replace function provision_salon_for_user(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_phone text,
  p_role text default 'owner'
)
returns uuid as $$
declare
  v_salon_id uuid;
  v_display_name text;
  v_role text;
begin
  v_role := case
    when p_role in ('owner', 'admin', 'staff') then p_role
    else 'staff'
  end;

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

    -- Owner/admin membership
    insert into memberships (salon_id, user_id, role, active)
    values (v_salon_id, p_user_id, v_role, true)
    on conflict (salon_id, user_id) do nothing;

    -- Staff profile
    insert into staff_profiles (salon_id, user_id, display_name, role, email, phone, active)
    select
      v_salon_id,
      p_user_id,
      coalesce(p_full_name, initcap(v_role)),
      v_role,
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
    -- User joining existing salon - create membership and profile
    insert into memberships (salon_id, user_id, role, active)
    values (v_salon_id, p_user_id, v_role, true)
    on conflict (salon_id, user_id) do update
      set active = true,
          role = excluded.role;

    -- Staff profile
    insert into staff_profiles (salon_id, user_id, display_name, role, email, phone, active)
    select
      v_salon_id,
      p_user_id,
      coalesce(p_full_name, initcap(v_role)),
      v_role,
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
