-- Add user_id to customers table for customer portal authentication

-- Add user_id column to customers
alter table customers 
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Create index for faster lookups by user_id
create index if not exists customers_user_id_idx on customers(user_id);

-- Create unique index to prevent duplicate customers per user per salon
create unique index if not exists customers_salon_user_unique 
  on customers(salon_id, user_id) 
  where user_id is not null;

-- Create customer_invitations table for salon owners to invite customers

create table if not exists customer_invitations (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  email text not null,
  invite_token text not null,
  created_by_user_id uuid references users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index for token lookups
create unique index if not exists customer_invitations_token_idx on customer_invitations(invite_token);

-- Index for email lookups per salon
create unique index if not exists customer_invitations_salon_email_idx on customer_invitations(salon_id, email) where accepted_at is null;

-- Update trigger for customer_invitations
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for customer portal

-- Enable RLS on customers
alter table customers enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Customers can view own profile" on customers;
drop policy if exists "Customers can update own profile" on customers;

-- Policy: Customers can view their own profile
CREATE POLICY "Customers can view own profile" ON customers
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Policy: Customers can update their own profile
CREATE POLICY "Customers can update own profile" ON customers
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Enable RLS on bookings
drop policy if exists "Customers can view own bookings" on bookings;
drop policy if exists "Customers can create own bookings" on bookings;

-- Policy: Customers can view their own bookings
CREATE POLICY "Customers can view own bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = bookings.customer_id 
      AND customers.user_id = auth.uid()
    )
  );
