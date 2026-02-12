-- Helper function to upsert platform admins with security definer (bypass RLS)
CREATE OR REPLACE FUNCTION upsert_platform_admin(
  p_user_id uuid,
  p_email text,
  p_active boolean DEFAULT true
)
RETURNS platform_admins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result platform_admins;
BEGIN
  INSERT INTO platform_admins (user_id, email, active)
  VALUES (p_user_id, p_email, COALESCE(p_active, true))
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        active = EXCLUDED.active,
        updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION upsert_platform_admin(uuid, text, boolean) FROM PUBLIC;
