-- Platform Admin Elite: Complete Database Schema
-- Migration: 0033_platform_admin_elite_complete

-- ============================================
-- REVENUE & SUBSCRIPTIONS
-- ============================================

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_amount integer NOT NULL DEFAULT 0, -- in øre/smallest currency unit
  price_currency char(3) NOT NULL DEFAULT 'DKK',
  billing_interval text NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
  features jsonb DEFAULT '[]'::jsonb,
  max_staff integer,
  max_bookings_monthly integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_subscription_plans ON subscription_plans;
CREATE TRIGGER set_updated_at_subscription_plans 
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Salon subscriptions
CREATE TABLE IF NOT EXISTS salon_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(salon_id)
);

DROP TRIGGER IF EXISTS set_updated_at_salon_subscriptions ON salon_subscriptions;
CREATE TRIGGER set_updated_at_salon_subscriptions 
  BEFORE UPDATE ON salon_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Dunning/failed payments tracking
CREATE TABLE IF NOT EXISTS dunning_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_subscription_id uuid NOT NULL REFERENCES salon_subscriptions(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK (attempt_number BETWEEN 1 AND 4),
  status text NOT NULL CHECK (status IN ('pending', 'retrying', 'success', 'failed')),
  error_message text,
  retry_at timestamptz,
  succeeded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dunning_status ON dunning_attempts(status);
CREATE INDEX IF NOT EXISTS idx_dunning_retry_at ON dunning_attempts(retry_at);

-- Revenue analytics (materialized view helper)
CREATE TABLE IF NOT EXISTS revenue_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  mrr_amount integer NOT NULL DEFAULT 0,
  new_subscriptions integer NOT NULL DEFAULT 0,
  churned_subscriptions integer NOT NULL DEFAULT 0,
  gmv_amount integer NOT NULL DEFAULT 0,
  failed_payments_amount integer NOT NULL DEFAULT 0,
  refunds_amount integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- QUEUE & BACKGROUND JOBS
-- ============================================

-- Job queue definitions
CREATE TABLE IF NOT EXISTS job_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Queue stats history (for trend analysis)
CREATE TABLE IF NOT EXISTS queue_stats_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name text NOT NULL REFERENCES job_queues(name),
  pending_count integer NOT NULL DEFAULT 0,
  processing_count integer NOT NULL DEFAULT 0,
  completed_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  dead_letter_count integer NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queue_stats_history_name_time 
  ON queue_stats_history(queue_name, recorded_at DESC);

-- ============================================
-- SECURITY & MONITORING
-- ============================================

-- Security anomalies
CREATE TABLE IF NOT EXISTS security_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_type text NOT NULL CHECK (anomaly_type IN ('ip_anomaly', 'time_anomaly', 'brute_force', 'unusual_pattern')),
  user_id uuid REFERENCES users(id),
  salon_id uuid REFERENCES salons(id),
  ip_address inet,
  user_agent text,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  investigated_by uuid REFERENCES users(id),
  investigated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_anomalies_status ON security_anomalies(status);
CREATE INDEX IF NOT EXISTS idx_security_anomalies_severity ON security_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_security_anomalies_created ON security_anomalies(created_at DESC);

-- Rate limit violations
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  user_id uuid REFERENCES users(id),
  ip_address inet NOT NULL,
  request_count integer NOT NULL,
  limit_count integer NOT NULL,
  window_seconds integer NOT NULL,
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_violations_ip ON rate_limit_violations(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_violations_created ON rate_limit_violations(created_at DESC);

-- ============================================
-- DATA EXPORTS
-- ============================================

-- Add format column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'data_exports' AND column_name = 'format') THEN
    ALTER TABLE data_exports ADD COLUMN format text DEFAULT 'json' CHECK (format IN ('json', 'csv'));
  END IF;
END $$;

-- Export processing log
CREATE TABLE IF NOT EXISTS data_export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id uuid NOT NULL REFERENCES data_exports(id) ON DELETE CASCADE,
  step text NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'processing', 'completed', 'failed')),
  message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_export ON data_export_logs(export_id, created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to log support actions with full audit
CREATE OR REPLACE FUNCTION log_support_action(
  p_action_type text,
  p_performed_by uuid,
  p_salon_id uuid DEFAULT NULL,
  p_target_user_id uuid DEFAULT NULL,
  p_target_booking_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO support_actions (
    action_type, performed_by, salon_id, target_user_id, 
    target_booking_id, reason, metadata
  ) VALUES (
    p_action_type, p_performed_by, p_salon_id, p_target_user_id,
    p_target_booking_id, p_reason, p_metadata
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate platform metrics
CREATE OR REPLACE FUNCTION calculate_platform_metrics(p_period text)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_start_date timestamptz;
BEGIN
  v_start_date := CASE p_period
    WHEN '24h' THEN now() - interval '24 hours'
    WHEN '7d' THEN now() - interval '7 days'
    WHEN '30d' THEN now() - interval '30 days'
    ELSE now() - interval '24 hours'
  END;
  
  SELECT jsonb_build_object(
    'active_salons', (SELECT count(*) FROM salons WHERE status = 'active'),
    'total_salons', (SELECT count(*) FROM salons),
    'new_salons', (SELECT count(*) FROM salons WHERE created_at >= v_start_date),
    'gmv', COALESCE((SELECT sum(amount) FROM payments 
      WHERE created_at >= v_start_date AND status IN ('succeeded', 'paid')), 0),
    'failed_payments', COALESCE((SELECT count(*) FROM payments 
      WHERE created_at >= v_start_date AND status = 'failed'), 0),
    'total_payments', COALESCE((SELECT count(*) FROM payments 
      WHERE created_at >= v_start_date), 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to record queue stats
CREATE OR REPLACE FUNCTION record_queue_stats(
  p_queue_name text,
  p_pending integer,
  p_processing integer,
  p_completed integer,
  p_failed integer,
  p_dead_letter integer DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO job_queue_stats (
    queue_name, pending_count, processing_count, 
    completed_count, failed_count, dead_letter_count
  ) VALUES (
    p_queue_name, p_pending, p_processing,
    p_completed, p_failed, p_dead_letter
  );
  
  -- Also record in history
  INSERT INTO queue_stats_history (
    queue_name, pending_count, processing_count,
    completed_count, failed_count, dead_letter_count
  ) VALUES (
    p_queue_name, p_pending, p_processing,
    p_completed, p_failed, p_dead_letter
  );
END;
$$ LANGUAGE plpgsql;

-- Seed subscription plans
INSERT INTO subscription_plans (key, name, description, price_amount, billing_interval, features, max_staff, max_bookings_monthly)
VALUES 
  ('starter', 'Starter', 'Perfect for small salons just getting started', 0, 'month', '["1 staff member", "50 bookings/month", "Basic support"]'::jsonb, 1, 50),
  ('professional', 'Professional', 'Most popular choice for growing salons', 29900, 'month', '["5 staff members", "Unlimited bookings", "Priority support", "Advanced analytics"]'::jsonb, 5, NULL),
  ('enterprise', 'Enterprise', 'For large salons with advanced needs', 79900, 'month', '["Unlimited staff", "Unlimited bookings", "24/7 support", "Custom integrations"]'::jsonb, NULL, NULL)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features;

-- Seed job queues
INSERT INTO job_queues (name, description, config)
VALUES 
  ('notification-outbox', 'Email and SMS notifications', '{"retry_attempts": 3}'::jsonb),
  ('payment-processing', 'Payment processing and webhooks', '{"retry_attempts": 5}'::jsonb),
  ('booking-reminders', 'Booking reminder notifications', '{"retry_attempts": 2}'::jsonb)
ON CONFLICT (name) DO NOTHING;
