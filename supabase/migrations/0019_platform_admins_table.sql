-- Platform Admins table
-- Simple platform admin management (single level)

create table if not exists platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (email)
);

-- Enable RLS
alter table platform_admins enable row level security;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_admins_user_id ON platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_platform_admins ON platform_admins;
CREATE TRIGGER set_updated_at_platform_admins
  BEFORE UPDATE ON platform_admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS Policy: Only system can manage (admins manage via special endpoints)
DROP POLICY IF EXISTS "Platform admins system managed" ON platform_admins;
CREATE POLICY "Platform admins system managed"
  ON platform_admins FOR ALL
  USING (false);

-- Function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_admins 
    WHERE user_id = p_user_id AND active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Add audit logging trigger for platform admin actions
-- This logs all changes to the platform_admins table
CREATE OR REPLACE FUNCTION audit_platform_admin_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.user_id, 'platform_admin.created', 'platform_admin', NEW.id, 
            jsonb_build_object('email', NEW.email, 'active', NEW.active));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (NEW.user_id, 'platform_admin.updated', 'platform_admin', NEW.id,
            jsonb_build_object('old_active', OLD.active, 'new_active', NEW.active, 
                               'old_email', OLD.email, 'new_email', NEW.email));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (OLD.user_id, 'platform_admin.deleted', 'platform_admin', OLD.id,
            jsonb_build_object('email', OLD.email));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_platform_admin_trigger ON platform_admins;
CREATE TRIGGER audit_platform_admin_trigger
  AFTER INSERT OR UPDATE OR DELETE ON platform_admins
  FOR EACH ROW EXECUTE FUNCTION audit_platform_admin_changes();

-- Insert existing platform admin if not exists (migration from .env)
-- This ensures backward compatibility
DO $$
DECLARE
  v_platform_admin_id uuid := '84b565e6-e67a-45be-9d97-23a5c0d91982';
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = v_platform_admin_id) THEN
    INSERT INTO platform_admins (user_id, email, active)
    VALUES (v_platform_admin_id, 'platformadmin@gmail.com', true)
    ON CONFLICT (user_id) DO UPDATE
      SET email = EXCLUDED.email,
          active = true;
  END IF;
END $$;
