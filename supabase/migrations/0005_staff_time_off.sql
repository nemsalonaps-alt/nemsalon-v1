create table if not exists staff_time_off (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  staff_id uuid not null references staff_profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_time_off_time_valid check (end_time > start_time)
);

create index if not exists staff_time_off_staff_idx on staff_time_off (staff_id);
create index if not exists staff_time_off_salon_idx on staff_time_off (salon_id);
create index if not exists staff_time_off_start_idx on staff_time_off (start_time);

create trigger set_updated_at_staff_time_off before update on staff_time_off
  for each row execute function set_updated_at();
