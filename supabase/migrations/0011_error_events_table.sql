create table if not exists error_events (
  id uuid primary key default gen_random_uuid(),
  route text,
  status integer not null,
  error_key text,
  request_id text,
  user_id uuid references users(id) on delete set null,
  salon_id uuid references salons(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists error_events_created_at_idx
  on error_events (created_at desc);

create index if not exists error_events_key_created_at_idx
  on error_events (error_key, created_at desc);

create index if not exists error_events_route_status_idx
  on error_events (route, status, created_at desc);
