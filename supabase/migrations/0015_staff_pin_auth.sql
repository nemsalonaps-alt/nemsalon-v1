-- Staff PIN authentication and customer invitation system

-- Staff authentication table for PIN-based login
create table if not exists staff_auth (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff_profiles(id) on delete cascade,
  salon_id uuid not null references salons(id) on delete cascade,
  invited_email text not null,
  invite_token text unique not null,
  invite_expires_at timestamptz not null default (now() + interval '7 days'),
  pin_hash text, -- bcrypt hash of 4-6 digit PIN
  pin_set_at timestamptz,
  last_login_at timestamptz,
  failed_login_attempts int not null default 0,
  locked_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id)
);

-- Customer invitations for salon access
create table if not exists customer_invitations (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  email text not null,
  invite_token text unique not null,
  invite_expires_at timestamptz not null default (now() + interval '7 days'),
  customer_id uuid references customers(id) on delete set null,
  accepted_at timestamptz,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, email)
);

-- Add user_id reference to staff_profiles table for linking to auth.users
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'staff_profiles' and column_name = 'user_id') then
    alter table staff_profiles add column user_id uuid references users(id) on delete set null;
  end if;
end $$;

-- Index for faster lookups
create index if not exists idx_staff_auth_invite_token on staff_auth(invite_token);
create index if not exists idx_staff_auth_staff_id on staff_auth(staff_id);
create index if not exists idx_staff_auth_salon_id on staff_auth(salon_id);
create index if not exists idx_customer_invitations_token on customer_invitations(invite_token);
create index if not exists idx_customer_invitations_salon_email on customer_invitations(salon_id, email);

-- Triggers for updated_at
drop trigger if exists set_updated_at_staff_auth on staff_auth;
create trigger set_updated_at_staff_auth
  before update on staff_auth
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at_customer_invitations on customer_invitations;
create trigger set_updated_at_customer_invitations
  before update on customer_invitations
  for each row execute function set_updated_at();

-- Enable RLS
alter table staff_auth enable row level security;
alter table customer_invitations enable row level security;

-- RLS policies for staff_auth
drop policy if exists "Staff auth visible to salon members" on staff_auth;
create policy "Staff auth visible to salon members"
  on staff_auth for select
  using (exists (
    select 1 from memberships
    where salon_id = staff_auth.salon_id
    and user_id = auth.uid()
    and active = true
  ));

drop policy if exists "Staff auth manageable by owner/admin" on staff_auth;
create policy "Staff auth manageable by owner/admin"
  on staff_auth for all
  using (exists (
    select 1 from memberships
    where salon_id = staff_auth.salon_id
    and user_id = auth.uid()
    and active = true
    and role in ('owner', 'admin')
  ));

-- RLS policies for customer_invitations
drop policy if exists "Invitations visible to salon members" on customer_invitations;
create policy "Invitations visible to salon members"
  on customer_invitations for select
  using (exists (
    select 1 from memberships
    where salon_id = customer_invitations.salon_id
    and user_id = auth.uid()
    and active = true
  ));

drop policy if exists "Invitations manageable by owner/admin" on customer_invitations;
create policy "Invitations manageable by owner/admin"
  on customer_invitations for all
  using (exists (
    select 1 from memberships
    where salon_id = customer_invitations.salon_id
    and user_id = auth.uid()
    and active = true
    and role in ('owner', 'admin')
  ));

-- Staff sessions for token-based auth
CREATE TABLE IF NOT EXISTS staff_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL, -- SHA256 hash of token (token is only shown once)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_staff_sessions_token ON staff_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff ON staff_sessions(staff_id);

-- Cleanup expired sessions function
CREATE OR REPLACE FUNCTION cleanup_expired_staff_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM staff_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;

-- Only system can manage sessions directly
CREATE POLICY "Staff sessions system managed"
  ON staff_sessions FOR ALL
  USING (false);
