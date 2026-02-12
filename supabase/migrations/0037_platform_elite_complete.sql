-- Platform Admin Elite: Complete Schema & Missing Tables
-- Migration: 0034_platform_elite_complete

-- ============================================
-- INCIDENTS TABLE (New)
-- ============================================

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'monitoring', 'resolved')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  root_cause TEXT,
  resolution TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_started ON incidents(started_at DESC);

CREATE TABLE IF NOT EXISTS incident_affected_salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  impact_description TEXT,
  UNIQUE(incident_id, salon_id)
);

CREATE TABLE IF NOT EXISTS incident_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_timeline ON incident_timeline(incident_id, created_at DESC);

-- ============================================
-- PLATFORM METRICS (Time-series)
-- ============================================

CREATE TABLE IF NOT EXISTS platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  unit TEXT,
  labels JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_metrics_name_time
  ON platform_metrics(metric_name, created_at DESC);

-- ============================================
-- PLATFORM HEALTH CHECKS
-- ============================================

CREATE TABLE IF NOT EXISTS platform_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
  message TEXT,
  response_time_ms INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_name_time
  ON platform_health_checks(check_name, created_at DESC);

-- ============================================
-- CUSTOMER PORTAL V2: RECEIPTS
-- ============================================

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  receipt_number TEXT UNIQUE NOT NULL,
  
  -- Amount breakdown
  service_amount NUMERIC(10,2) NOT NULL,
  tip_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'DKK',
  
  -- VAT info (important for DK)
  vat_amount NUMERIC(10,2) DEFAULT 0,
  vat_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Payment info
  payment_method TEXT CHECK (payment_method IN ('card', 'mobilepay', 'cash', 'giftcard', 'other')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  
  -- PDF generation
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  
  -- Metadata
  salon_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  staff_name TEXT,
  customer_name TEXT NOT NULL,
  booking_date TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_customer ON receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_booking ON receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_receipts_salon ON receipts(salon_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(created_at DESC);

-- ============================================
-- CUSTOMER PORTAL V2: FAVORITES
-- ============================================

CREATE TABLE IF NOT EXISTS customer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, salon_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_customer ON customer_favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_favorites_salon ON customer_favorites(salon_id);

-- ============================================
-- CUSTOMER PORTAL V2: NOTIFICATION SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS customer_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  
  -- Booking reminders
  sms_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  reminder_24h BOOLEAN DEFAULT TRUE,
  reminder_1h BOOLEAN DEFAULT FALSE,
  
  -- Marketing
  marketing_email BOOLEAN DEFAULT FALSE,
  marketing_sms BOOLEAN DEFAULT FALSE,
  
  -- GDPR consent
  data_processing_consent BOOLEAN DEFAULT TRUE,
  consent_updated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CUSTOMER PORTAL V2: NOTIFICATION HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS customer_notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  notification_type TEXT NOT NULL CHECK (notification_type IN ('booking_confirmation', 'booking_reminder', 'booking_cancellation', 'payment_receipt', 'marketing', 'system')),
  purpose TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'push')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  
  -- Delivery info
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  -- Content preview
  subject TEXT,
  message_preview TEXT,
  
  -- Provider info
  provider_message_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_history_customer ON customer_notification_history(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON customer_notification_history(status);

-- ============================================
-- STAFF EARNINGS (Additional from staff-schema.sql)
-- ============================================

CREATE TABLE IF NOT EXISTS staff_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL,
  salon_id UUID NOT NULL,
  
  service_amount DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'DKK',
  
  status TEXT NOT NULL DEFAULT 'calculated' CHECK (status IN ('calculated', 'paid', 'disputed')),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_earnings_staff ON staff_earnings(staff_id);
CREATE INDEX idx_staff_earnings_booking ON staff_earnings(booking_id);
CREATE INDEX idx_staff_earnings_date ON staff_earnings(calculated_at);
CREATE INDEX idx_staff_earnings_status ON staff_earnings(status);

-- ============================================
-- STAFF GOALS
-- ============================================

CREATE TABLE IF NOT EXISTS staff_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL,
  
  goal_type TEXT NOT NULL DEFAULT 'monthly' CHECK (goal_type IN ('monthly', 'weekly', 'quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  target_amount DECIMAL(10,2) NOT NULL,
  target_bookings INTEGER,
  target_hours DECIMAL(5,2),
  
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'missed')),
  achieved_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(staff_id, goal_type, period_start)
);

CREATE INDEX idx_staff_goals_staff ON staff_goals(staff_id);
CREATE INDEX idx_staff_goals_period ON staff_goals(period_start, period_end);

-- ============================================
-- SALON RISK ASSESSMENTS (for Risk Radar)
-- ============================================

CREATE TABLE IF NOT EXISTS salon_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Risk factors
  factors JSONB DEFAULT '{}',
  no_bookings_30_days BOOLEAN DEFAULT FALSE,
  failed_payment_rate DECIMAL(5,4) DEFAULT 0,
  cancellation_rate DECIMAL(5,4) DEFAULT 0,
  error_count_24h INTEGER DEFAULT 0,
  booking_decline_wow DECIMAL(5,4) DEFAULT 0,
  
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_salon_assessed ON salon_risk_assessments(salon_id, assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_score_desc ON salon_risk_assessments(risk_score DESC);

-- ============================================
-- UPDATE TRIGGER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STAFF EARNINGS TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION trigger_calculate_earnings_on_booking_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id UUID;
  v_commission_rate DECIMAL(5,2);
  v_commission_amount DECIMAL(10,2);
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT staff_id INTO v_staff_id FROM booking_staff WHERE booking_id = NEW.id LIMIT 1;
    
    IF v_staff_id IS NULL THEN
      v_staff_id := NEW.staff_id;
    END IF;
    
    SELECT commission_rate INTO v_commission_rate
    FROM staff_profiles WHERE id = v_staff_id;
    v_commission_rate := COALESCE(v_commission_rate, 40);
    
    v_commission_amount := ROUND(COALESCE(NEW.total_amount, 0) * (v_commission_rate / 100), 2);
    
    INSERT INTO staff_earnings (
      booking_id, staff_id, service_id, salon_id,
      service_amount, commission_percentage, commission_amount,
      total_earned, currency
    ) VALUES (
      NEW.id, v_staff_id, NEW.service_id, NEW.salon_id,
      COALESCE(NEW.total_amount, 0), v_commission_rate, v_commission_amount,
      v_commission_amount, COALESCE(NEW.currency, 'DKK')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calculate_earnings_on_booking_complete ON bookings;
CREATE TRIGGER calculate_earnings_on_booking_complete
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_earnings_on_booking_complete();

-- ============================================
-- SAMPLE DATA (Optional - for dev)
-- ============================================

-- INSERT INTO receipt_number_seq VALUES (1000);
