-- Stripe Connect fields for salons (Standard accounts)
alter table salons
  add column if not exists stripe_account_id text,
  add column if not exists stripe_details_submitted boolean not null default false,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false,
  add column if not exists stripe_onboarding_completed_at timestamptz,
  add column if not exists stripe_connect_state text,
  add column if not exists stripe_connect_state_expires_at timestamptz;

create unique index if not exists salons_stripe_account_id_idx
  on salons (stripe_account_id)
  where stripe_account_id is not null;
