-- Platform Admin Elite: Schema Fixes
-- Migration: 0034_fix_platform_schema

-- ============================================
-- FIX: Queue Stats Table Reference
-- ============================================

-- The record_queue_stats function was referencing job_queue_stats but the table is queue_stats_history
-- Create the missing job_queue_stats table for the function
CREATE TABLE IF NOT EXISTS job_queue_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name text NOT NULL,
  pending_count integer NOT NULL DEFAULT 0,
  processing_count integer NOT NULL DEFAULT 0,
  completed_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  dead_letter_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_stats_name ON job_queue_stats(queue_name);
CREATE INDEX IF NOT EXISTS idx_job_queue_stats_created ON job_queue_stats(created_at DESC);

-- Update the record_queue_stats function to use the correct table
CREATE OR REPLACE FUNCTION record_queue_stats(
  p_queue_name text,
  p_pending integer,
  p_processing integer,
  p_completed integer,
  p_failed integer,
  p_dead_letter integer DEFAULT 0
) RETURNS void AS $$
BEGIN
  -- Insert into job_queue_stats for current stats
  INSERT INTO job_queue_stats (
    queue_name, pending_count, processing_count,
    completed_count, failed_count, dead_letter_count
  ) VALUES (
    p_queue_name, p_pending, p_processing,
    p_completed, p_failed, p_dead_letter
  );

  -- Also record in history for trend analysis
  INSERT INTO queue_stats_history (
    queue_name, pending_count, processing_count,
    completed_count, failed_count, dead_letter_count
  ) VALUES (
    p_queue_name, p_pending, p_processing,
    p_completed, p_failed, p_dead_letter
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SALON RISK ASSESSMENTS
-- ============================================

-- Create salon risk assessments table for risk radar
CREATE TABLE IF NOT EXISTS salon_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  risk_score integer NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  factors jsonb DEFAULT '{}'::jsonb,
  no_bookings_30_days boolean DEFAULT false,
  failed_payment_rate numeric(5,2) DEFAULT 0,
  cancellation_rate numeric(5,2) DEFAULT 0,
  error_count_24h integer DEFAULT 0,
  booking_decline_wow numeric(5,2) DEFAULT 0,
  last_assessment_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add updated_at column if it doesn't exist (for compatibility with older migrations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'salon_risk_assessments' AND column_name = 'updated_at') THEN
    ALTER TABLE salon_risk_assessments ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_risk_assessments_salon ON salon_risk_assessments(salon_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_score ON salon_risk_assessments(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_level ON salon_risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_updated ON salon_risk_assessments(updated_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_salon_risk_assessments ON salon_risk_assessments;
CREATE TRIGGER set_updated_at_salon_risk_assessments
  BEFORE UPDATE ON salon_risk_assessments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- ADDITIONAL PLATFORM TABLES
-- ============================================

-- Platform notifications for admin alerts
CREATE TABLE IF NOT EXISTS platform_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('incident', 'alert', 'info', 'warning')),
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_notifications_read ON platform_notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_notifications_severity ON platform_notifications(severity, created_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to assess salon risk
CREATE OR REPLACE FUNCTION assess_salon_risk(p_salon_id uuid)
RETURNS uuid AS $$
DECLARE
  v_assessment_id uuid;
  v_risk_score integer := 0;
  v_risk_level text;
  v_factors jsonb := '{}'::jsonb;
  v_last_booking timestamptz;
  v_failed_payments numeric;
  v_total_payments numeric;
  v_cancelled_bookings numeric;
  v_total_bookings numeric;
  v_error_count integer;
BEGIN
  -- Check last booking date
  SELECT MAX(created_at) INTO v_last_booking FROM bookings WHERE salon_id = p_salon_id;
  IF v_last_booking IS NULL OR v_last_booking < now() - interval '30 days' THEN
    v_risk_score := v_risk_score + 25;
    v_factors := v_factors || jsonb_build_object('noBookings30Days', true);
  END IF;

  -- Calculate failed payment rate
  SELECT
    COUNT(CASE WHEN status = 'failed' THEN 1 END)::numeric /
    NULLIF(COUNT(*), 0)::numeric
  INTO v_failed_payments
  FROM payments
  WHERE salon_id = p_salon_id
  AND created_at >= now() - interval '30 days';

  IF v_failed_payments > 0.1 THEN
    v_risk_score := v_risk_score + 20;
    v_factors := v_factors || jsonb_build_object('failedPaymentRate', v_failed_payments);
  END IF;

  -- Calculate cancellation rate
  SELECT
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::numeric /
    NULLIF(COUNT(*), 0)::numeric
  INTO v_cancelled_bookings
  FROM bookings
  WHERE salon_id = p_salon_id
  AND created_at >= now() - interval '30 days';

  IF v_cancelled_bookings > 0.2 THEN
    v_risk_score := v_risk_score + 15;
    v_factors := v_factors || jsonb_build_object('cancellationRate', v_cancelled_bookings);
  END IF;

  -- Count recent errors (this is simplified - would need error_events table)
  SELECT COUNT(*) INTO v_error_count
  FROM error_events
  WHERE salon_id = p_salon_id
  AND created_at >= now() - interval '24 hours';

  IF v_error_count > 50 THEN
    v_risk_score := v_risk_score + 25;
    v_factors := v_factors || jsonb_build_object('errorCount24h', v_error_count);
  END IF;

  -- Determine risk level
  v_risk_level := CASE
    WHEN v_risk_score >= 75 THEN 'critical'
    WHEN v_risk_score >= 50 THEN 'high'
    WHEN v_risk_score >= 25 THEN 'medium'
    ELSE 'low'
  END;

  -- Upsert the assessment
  INSERT INTO salon_risk_assessments (
    salon_id, risk_score, risk_level, factors,
    no_bookings_30_days, failed_payment_rate, cancellation_rate, error_count_24h
  ) VALUES (
    p_salon_id, v_risk_score, v_risk_level, v_factors,
    v_last_booking IS NULL OR v_last_booking < now() - interval '30 days',
    COALESCE(v_failed_payments, 0),
    COALESCE(v_cancelled_bookings, 0),
    v_error_count
  )
  ON CONFLICT (salon_id) DO UPDATE SET
    risk_score = EXCLUDED.risk_score,
    risk_level = EXCLUDED.risk_level,
    factors = EXCLUDED.factors,
    no_bookings_30_days = EXCLUDED.no_bookings_30_days,
    failed_payment_rate = EXCLUDED.failed_payment_rate,
    cancellation_rate = EXCLUDED.cancellation_rate,
    error_count_24h = EXCLUDED.error_count_24h,
    last_assessment_at = now()
  RETURNING id INTO v_assessment_id;

  RETURN v_assessment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INCIDENT TIMELINE TABLE (if missing)
-- ============================================

CREATE TABLE IF NOT EXISTS incident_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident ON incident_timeline(incident_id, created_at DESC);

-- ============================================
-- INCIDENT AFFECTED SALONS (if missing)
-- ============================================

CREATE TABLE IF NOT EXISTS incident_affected_salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(incident_id, salon_id)
);

-- ============================================
-- SUPPORT ACTIONS TABLE (if missing)
-- ============================================

CREATE TABLE IF NOT EXISTS support_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  performed_by uuid NOT NULL REFERENCES users(id),
  salon_id uuid REFERENCES salons(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_actions_salon ON support_actions(salon_id);
CREATE INDEX IF NOT EXISTS idx_support_actions_performed_by ON support_actions(performed_by);
CREATE INDEX IF NOT EXISTS idx_support_actions_created_at ON support_actions(created_at DESC);

-- ============================================
-- DATA EXPORTS TABLE (if missing)
-- ============================================

CREATE TABLE IF NOT EXISTS data_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type text NOT NULL CHECK (export_type IN ('full_salon', 'customer_data', 'audit_logs')),
  salon_id uuid REFERENCES salons(id) ON DELETE CASCADE,
  format text DEFAULT 'json' CHECK (format IN ('json', 'csv')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url text,
  file_size_bytes integer,
  expires_at timestamptz,
  error_message text,
  requested_by uuid NOT NULL REFERENCES users(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status);
CREATE INDEX IF NOT EXISTS idx_data_exports_salon ON data_exports(salon_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_requested_by ON data_exports(requested_by);

DROP TRIGGER IF EXISTS set_updated_at_data_exports ON data_exports;
CREATE TRIGGER set_updated_at_data_exports
  BEFORE UPDATE ON data_exports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- FEATURE FLAGS TABLE (if missing)
-- ============================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  rollout_type text NOT NULL DEFAULT 'global' CHECK (rollout_type IN ('global', 'percentage', 'targeted')),
  rollout_percentage integer,
  targeted_salon_ids uuid[] DEFAULT '{}'::uuid[],
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags("key");

DROP TRIGGER IF EXISTS set_updated_at_feature_flags ON feature_flags;
CREATE TRIGGER set_updated_at_feature_flags
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- SEED DEFAULT FEATURE FLAGS
-- ============================================

INSERT INTO feature_flags ("key", name, description, enabled, rollout_type)
VALUES 
  ('new-booking-flow', 'New Booking Flow', 'Enable the new multi-step booking flow', true, 'global'),
  ('customer-portal-v2', 'Customer Portal V2', 'Enable the new customer portal design', true, 'global'),
  ('stripe-connect', 'Stripe Connect', 'Enable Stripe Connect for payments', true, 'global')
ON CONFLICT ("key") DO NOTHING;

-- ============================================
-- ERROR EVENTS TABLE (for error tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid REFERENCES salons(id) ON DELETE SET NULL,
  error_type text,
  error_message text,
  stack_trace text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add error_type column if it doesn't exist (for compatibility)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'error_events' AND column_name = 'error_type') THEN
    ALTER TABLE error_events ADD COLUMN error_type text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_error_events_salon ON error_events(salon_id);
CREATE INDEX IF NOT EXISTS idx_error_events_type ON error_events(error_type);
CREATE INDEX IF NOT EXISTS idx_error_events_created ON error_events(created_at DESC);
