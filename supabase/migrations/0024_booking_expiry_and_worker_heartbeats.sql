-- Add booking expiration tracking
alter table bookings
  add column if not exists expires_at timestamptz;

-- Backfill: set expiry for existing pending bookings if missing
update bookings
set expires_at = created_at + interval '30 minutes'
where status = 'pending' and expires_at is null;

create index if not exists bookings_pending_expires_at_idx
  on bookings (expires_at)
  where status = 'pending';

-- Worker heartbeats for readiness checks
create table if not exists worker_heartbeats (
  worker_name text primary key,
  last_seen_at timestamptz not null,
  details jsonb
);

