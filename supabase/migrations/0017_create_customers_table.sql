-- Create customers table for customer portal
-- This migration creates the customers table if it doesn't exist

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  salon_id uuid references salons(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for faster lookups by user_id
create index if not exists customers_user_id_idx on customers(user_id);

-- Index for salon lookups
create index if not exists customers_salon_id_idx on customers(salon_id);

-- Unique index to prevent duplicate customers per user per salon
create unique index if not exists customers_salon_user_unique 
  on customers(salon_id, user_id) 
  where user_id is not null;

-- Index for email lookups per salon
create unique index if not exists customers_salon_email_unique 
  on customers(salon_id, email);

-- Update trigger (drop first to avoid conflicts)
drop trigger if exists set_customers_updated_at on customers;
create trigger set_customers_updated_at
  before update on customers
  for each row
  execute function set_updated_at();

-- Enable RLS
alter table customers enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Customers can view own profile" on customers;
drop policy if exists "Customers can update own profile" on customers;

-- Policy: Customers can view their own profile
create policy "Customers can view own profile" on customers
  for select using (
    user_id = auth.uid()
  );

-- Policy: Customers can update their own profile
create policy "Customers can update own profile" on customers
  for update using (
    user_id = auth.uid()
  );
