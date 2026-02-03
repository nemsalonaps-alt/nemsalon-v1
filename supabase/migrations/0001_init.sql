create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists salons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  timezone text not null default 'Europe/Copenhagen',
  locale text not null default 'da-DK',
  currency char(3) not null default 'DKK',
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

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
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

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price_amount integer not null check (price_amount >= 0),
  currency char(3) not null default 'DKK',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
create trigger set_updated_at_users before update on users
  for each row execute function set_updated_at();
create trigger set_updated_at_memberships before update on memberships
  for each row execute function set_updated_at();
create trigger set_updated_at_staff_profiles before update on staff_profiles
  for each row execute function set_updated_at();
create trigger set_updated_at_services before update on services
  for each row execute function set_updated_at();
create trigger set_updated_at_customers before update on customers
  for each row execute function set_updated_at();
create trigger set_updated_at_bookings before update on bookings
  for each row execute function set_updated_at();
create trigger set_updated_at_payments before update on payments
  for each row execute function set_updated_at();
create trigger set_updated_at_notification_outbox before update on notification_outbox
  for each row execute function set_updated_at();
