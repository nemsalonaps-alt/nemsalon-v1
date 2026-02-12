-- Allow service role to manage platform_admins while keeping all other roles blocked
DROP POLICY IF EXISTS "Platform admins system managed" ON platform_admins;
DROP POLICY IF EXISTS "Platform admins service role only" ON platform_admins;

CREATE POLICY "Platform admins service role only"
  ON platform_admins FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
