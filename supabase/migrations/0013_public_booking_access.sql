create table if not exists booking_access_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create unique index if not exists booking_access_tokens_hash_idx
  on booking_access_tokens (token_hash);

create index if not exists booking_access_tokens_booking_idx
  on booking_access_tokens (booking_id);

update salons
set slug = concat_ws(
  '-',
  trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')),
  substring(id::text from 1 for 6)
)
where (slug is null or slug = '');

create or replace function provision_salon_for_user(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_phone text
)
returns uuid as $$
declare
  v_salon_id uuid;
begin
  insert into users (id, email, full_name, phone)
  values (p_user_id, p_email, p_full_name, p_phone)
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        phone = excluded.phone;

  select primary_salon_id
    into v_salon_id
    from users
   where id = p_user_id
   for update;

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

    insert into memberships (salon_id, user_id, role, active)
    values (v_salon_id, p_user_id, 'owner', true)
    on conflict (salon_id, user_id) do nothing;

    update users
       set primary_salon_id = v_salon_id
     where id = p_user_id;

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
    insert into memberships (salon_id, user_id, role, active)
    values (v_salon_id, p_user_id, 'staff', true)
    on conflict (salon_id, user_id) do update
      set active = true;
  end if;

  return v_salon_id;
end;
$$ language plpgsql;
