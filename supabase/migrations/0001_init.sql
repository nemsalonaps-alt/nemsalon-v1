create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'salon_status') then
    create type salon_status as enum ('draft', 'active');
  end if;
end $$;

create table if not exists salons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  timezone text not null default 'Europe/Copenhagen',
  locale text not null default 'da-DK',
  currency char(3) not null default 'DKK',
  status salon_status not null default 'draft',
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text default 'DK',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists salon_business_hours (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  day text not null check (day in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  start_time time not null,
  end_time time not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, day),
  constraint salon_business_hours_time_valid check (end_time > start_time)
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  primary_salon_id uuid references salons(id) on delete set null,
  email text,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, user_id)
);

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
    values (v_salon_id, p_user_id, 'owner', true)
    on conflict (salon_id, user_id) do nothing;
  end if;

  return v_salon_id;
end;
$$ language plpgsql;

create table if not exists staff_profiles (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  display_name text not null,
  role text not null default 'staff' check (role in ('owner', 'admin', 'staff')),
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff_working_hours (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff_profiles(id) on delete cascade,
  day text not null check (day in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  start_time time not null,
  end_time time not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, day),
  constraint staff_working_hours_time_valid check (end_time > start_time)
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  buffer_minutes integer not null default 0 check (buffer_minutes >= 0),
  price_amount integer not null check (price_amount >= 0),
  currency char(3) not null default 'DKK',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff_services (
  staff_id uuid not null references staff_profiles(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (staff_id, service_id)
);

create index if not exists staff_services_service_idx on staff_services (service_id);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum (
      'pending',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show'
    );
  end if;
end $$;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  staff_id uuid not null references staff_profiles(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status booking_status not null default 'pending',
  notes text,
  total_amount integer not null,
  currency char(3) not null default 'DKK',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_time_valid check (end_time > start_time)
);

create index if not exists bookings_salon_start_idx on bookings (salon_id, start_time);

alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status in ('pending', 'confirmed', 'in_progress'));

do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum (
      'pending',
      'paid',
      'failed',
      'refunded'
    );
  end if;
end $$;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'mobilepay')),
  status payment_status not null default 'pending',
  subtotal_amount integer check (subtotal_amount >= 0),
  tax_amount integer check (tax_amount >= 0),
  total_amount integer check (total_amount >= 0),
  amount integer not null,
  currency char(3) not null default 'DKK',
  provider_reference text,
  provider_event_id text,
  idempotency_key text,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create unique index if not exists payments_active_booking_idx
  on payments (booking_id)
  where status in ('pending', 'paid');

do $$ begin
  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type notification_channel as enum ('email', 'sms', 'push');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'notification_status') then
    create type notification_status as enum ('pending', 'sent', 'failed');
  end if;
end $$;

create table if not exists notification_outbox (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  channel notification_channel not null,
  provider text not null,
  recipient text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status notification_status not null default 'pending',
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notification_outbox_dedupe_key_idx
  on notification_outbox (dedupe_key)
  where dedupe_key is not null;

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete set null,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create trigger set_updated_at_salons before update on salons
  for each row execute function set_updated_at();
create trigger set_updated_at_salon_business_hours before update on salon_business_hours
  for each row execute function set_updated_at();
create trigger set_updated_at_users before update on users
  for each row execute function set_updated_at();
create trigger set_updated_at_memberships before update on memberships
  for each row execute function set_updated_at();
create trigger set_updated_at_staff_profiles before update on staff_profiles
  for each row execute function set_updated_at();
create trigger set_updated_at_staff_working_hours before update on staff_working_hours
  for each row execute function set_updated_at();
create trigger set_updated_at_services before update on services
  for each row execute function set_updated_at();
create trigger set_updated_at_staff_services before update on staff_services
  for each row execute function set_updated_at();
create trigger set_updated_at_customers before update on customers
  for each row execute function set_updated_at();
create trigger set_updated_at_bookings before update on bookings
  for each row execute function set_updated_at();
create trigger set_updated_at_payments before update on payments
  for each row execute function set_updated_at();
create trigger set_updated_at_notification_outbox before update on notification_outbox
  for each row execute function set_updated_at();
