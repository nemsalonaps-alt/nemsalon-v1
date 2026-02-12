-- Unified Auth Migration - Simplifies all auth to Supabase Auth
-- This migration removes custom staff PIN auth and unifies everything

-- Step 1: Add role column to memberships if not exists (should already exist)
-- Note: memberships.role already exists from 0001_init.sql

-- Step 2: Create function to get user role across all salons
CREATE OR REPLACE FUNCTION get_user_primary_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM memberships
  WHERE user_id = p_user_id AND active = true
  ORDER BY 
    CASE role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'staff' THEN 3 
      ELSE 4 
    END
  LIMIT 1;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Add column to customers to track if they have auth account
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS has_auth_account BOOLEAN DEFAULT false;

-- Step 4: Update existing customers who have auth.users entries
UPDATE customers 
SET has_auth_account = true 
WHERE user_id IN (SELECT id FROM auth.users);

-- Step 5: Migrate staff_profiles to link properly with users
-- Add email column if not exists (from 0015 migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE staff_profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Step 6: Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_memberships_user_role 
ON memberships(user_id, role, active);

-- Note: We keep staff_auth and staff_sessions tables for now
-- They will be deprecated and removed in a future migration
-- after all staff have migrated to Supabase Auth

-- Step 7: Add deprecation notice comment
COMMENT ON TABLE staff_auth IS 'DEPRECATED: Staff now uses Supabase Auth. Table kept for migration reference.';
COMMENT ON TABLE staff_sessions IS 'DEPRECATED: Staff now uses Supabase Auth sessions. Table kept for migration reference.';
