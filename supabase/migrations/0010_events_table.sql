create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  user_id uuid references users(id) on delete set null,
  salon_id uuid references salons(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_event_key_created_at_idx
  on events (event_key, created_at desc);

create index if not exists events_salon_created_at_idx
  on events (salon_id, created_at desc);
