-- Ensure platform admin check can be executed under service role without RLS issues
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = p_user_id AND active = true
  );
END;
$$;

REVOKE ALL ON FUNCTION is_platform_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_platform_admin(UUID) TO service_role;

DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;
