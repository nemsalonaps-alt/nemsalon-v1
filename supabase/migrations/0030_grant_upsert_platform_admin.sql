GRANT EXECUTE ON FUNCTION upsert_platform_admin(uuid, text, boolean) TO service_role;
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;
