-- Migration: Comprehensive Payment Service Schema
-- Description: Adds tables and columns for complete payment service functionality
-- Created: 2026-02-12

-- =====================================================
-- REFUNDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'DKK',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  reason TEXT,
  provider_refund_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_salon ON refunds(salon_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at);

-- Enable RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Salon staff can view refunds" ON refunds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM salons s
      JOIN staff_profiles sp ON sp.salon_id = s.id
      JOIN staff_auth sa ON sa.staff_id = sp.id
      WHERE s.id = refunds.salon_id AND sa.id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all refunds" ON refunds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM platform_admins WHERE id = auth.uid()
    )
  );

-- =====================================================
-- CHARGEBACKS/DISPUTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  dispute_id TEXT NOT NULL UNIQUE,
  charge_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'DKK',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'needs_response' CHECK (status IN ('needs_response', 'under_review', 'won', 'lost', 'warning_closed')),
  evidence_due_date TIMESTAMPTZ,
  evidence_submitted_at TIMESTAMPTZ,
  evidence JSONB DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_payment ON payment_disputes(payment_id);
CREATE INDEX idx_disputes_salon ON payment_disputes(salon_id);
CREATE INDEX idx_disputes_status ON payment_disputes(status);

ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon staff can view disputes" ON payment_disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM salons s
      JOIN staff_profiles sp ON sp.salon_id = s.id
      JOIN staff_auth sa ON sa.staff_id = sp.id
      WHERE s.id = payment_disputes.salon_id AND sa.id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all disputes" ON payment_disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM platform_admins WHERE id = auth.uid()
    )
  );

-- =====================================================
-- PAYMENT METHODS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_method_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('card', 'mobilepay', 'invoice', 'bank_transfer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  last4 TEXT,
  brand TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  country TEXT,
  fingerprint TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_customer ON payment_methods(customer_id);
CREATE INDEX idx_payment_methods_salon ON payment_methods(salon_id);
CREATE INDEX idx_payment_methods_provider ON payment_methods(provider_method_id);
CREATE INDEX idx_payment_methods_status ON payment_methods(status);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own payment methods" ON payment_methods
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Salon staff can view salon payment methods" ON payment_methods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM salons s
      JOIN staff_profiles sp ON sp.salon_id = s.id
      JOIN staff_auth sa ON sa.staff_id = sp.id
      WHERE s.id = payment_methods.salon_id AND sa.id = auth.uid()
    )
  );

-- =====================================================
-- PAYMENT ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_transactions INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  refunded_transactions INTEGER DEFAULT 0,
  total_volume INTEGER DEFAULT 0,
  refunded_volume INTEGER DEFAULT 0,
  processing_fees INTEGER DEFAULT 0,
  platform_fees INTEGER DEFAULT 0,
  average_transaction_value INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  payment_methods_breakdown JSONB DEFAULT '{}',
  decline_reasons JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salon_id, date)
);

CREATE INDEX idx_payment_analytics_salon ON payment_analytics(salon_id);
CREATE INDEX idx_payment_analytics_date ON payment_analytics(date);
CREATE INDEX idx_payment_analytics_salon_date ON payment_analytics(salon_id, date);

ALTER TABLE payment_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon staff can view analytics" ON payment_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM salons s
      JOIN staff_profiles sp ON sp.salon_id = s.id
      JOIN staff_auth sa ON sa.staff_id = sp.id
      WHERE s.id = payment_analytics.salon_id AND sa.id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can view all analytics" ON payment_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM platform_admins WHERE id = auth.uid()
    )
  );

-- =====================================================
-- UPDATE PAYMENTS TABLE - ADD NEW COLUMNS
-- =====================================================
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS platform_fee_amount INTEGER,
ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS tax_amount INTEGER,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS transfer_id TEXT,
ADD COLUMN IF NOT EXISTS transfer_status TEXT CHECK (transfer_status IN ('pending', 'paid', 'failed')),
ADD COLUMN IF NOT EXISTS transfer_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS reconciliation_status TEXT DEFAULT 'unreconciled' CHECK (reconciliation_status IN ('unreconciled', 'reconciled', 'discrepancy')),
ADD COLUMN IF NOT EXISTS reconciliation_date TIMESTAMPTZ;

-- Create index for reconciliation queries
CREATE INDEX idx_payments_reconciliation ON payments(reconciliation_status) WHERE reconciliation_status != 'reconciled';
CREATE INDEX idx_payments_transfer ON payments(transfer_id);

-- =====================================================
-- PAYMENT EVENTS/WEBHOOK LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  provider TEXT NOT NULL DEFAULT 'stripe',
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX idx_payment_events_type ON payment_events(event_type);
CREATE INDEX idx_payment_events_processed ON payment_events(processed) WHERE processed = FALSE;
CREATE INDEX idx_payment_events_created ON payment_events(created_at);

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view events" ON payment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM platform_admins WHERE id = auth.uid()
    )
  );

-- =====================================================
-- GATEWAY HEALTH/STATUS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS gateway_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  latency_ms INTEGER,
  uptime_percentage DECIMAL(5,2),
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  last_failure_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize with default gateways
INSERT INTO gateway_health (gateway, status, uptime_percentage) VALUES
  ('stripe', 'healthy', 99.99),
  ('mobilepay', 'healthy', 99.95)
ON CONFLICT (gateway) DO NOTHING;

ALTER TABLE gateway_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage gateway health" ON gateway_health
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM platform_admins WHERE id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS update_refunds_updated_at ON refunds;
CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_disputes_updated_at ON payment_disputes;
CREATE TRIGGER update_payment_disputes_updated_at
  BEFORE UPDATE ON payment_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_analytics_updated_at ON payment_analytics;
CREATE TRIGGER update_payment_analytics_updated_at
  BEFORE UPDATE ON payment_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate chargeback rate for a salon
CREATE OR REPLACE FUNCTION calculate_chargeback_rate(
  p_salon_id UUID,
  p_from_date DATE,
  p_to_date DATE
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_total_payments INTEGER;
  v_disputed_payments INTEGER;
  v_rate DECIMAL(5,2);
BEGIN
  SELECT COUNT(*) INTO v_total_payments
  FROM payments
  WHERE salon_id = p_salon_id
    AND created_at::DATE BETWEEN p_from_date AND p_to_date
    AND status = 'succeeded';

  SELECT COUNT(*) INTO v_disputed_payments
  FROM payment_disputes
  WHERE salon_id = p_salon_id
    AND created_at::DATE BETWEEN p_from_date AND p_to_date;

  IF v_total_payments > 0 THEN
    v_rate := (v_disputed_payments::DECIMAL / v_total_payments) * 100;
  ELSE
    v_rate := 0;
  END IF;

  RETURN v_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to update payment analytics (can be called by a scheduled job)
CREATE OR REPLACE FUNCTION update_daily_payment_analytics(
  p_salon_id UUID,
  p_date DATE
)
RETURNS VOID AS $$
DECLARE
  v_total INTEGER;
  v_successful INTEGER;
  v_failed INTEGER;
  v_refunded INTEGER;
  v_total_volume INTEGER;
  v_refunded_volume INTEGER;
  v_processing_fees INTEGER;
  v_platform_fees INTEGER;
  v_avg_value INTEGER;
  v_success_rate DECIMAL(5,2);
BEGIN
  -- Calculate metrics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'succeeded'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status = 'refunded'),
    COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0)
  INTO v_total, v_successful, v_failed, v_refunded, v_total_volume, v_refunded_volume
  FROM payments
  WHERE salon_id = p_salon_id
    AND created_at::DATE = p_date;

  -- Calculate fees (simplified - in reality these would come from Stripe)
  v_processing_fees := ROUND(v_total_volume * 0.015 + (v_successful * 1.8));
  
  SELECT COALESCE(SUM(platform_fee_amount), 0)
  INTO v_platform_fees
  FROM payments
  WHERE salon_id = p_salon_id
    AND created_at::DATE = p_date
    AND status = 'succeeded';

  -- Calculate average and success rate
  IF v_successful > 0 THEN
    v_avg_value := v_total_volume / v_successful;
  ELSE
    v_avg_value := 0;
  END IF;

  IF v_total > 0 THEN
    v_success_rate := (v_successful::DECIMAL / v_total) * 100;
  ELSE
    v_success_rate := 0;
  END IF;

  -- Insert or update analytics
  INSERT INTO payment_analytics (
    salon_id, date, total_transactions, successful_transactions, 
    failed_transactions, refunded_transactions, total_volume, 
    refunded_volume, processing_fees, platform_fees, 
    average_transaction_value, success_rate
  ) VALUES (
    p_salon_id, p_date, v_total, v_successful, 
    v_failed, v_refunded, v_total_volume, 
    v_refunded_volume, v_processing_fees, v_platform_fees, 
    v_avg_value, v_success_rate
  )
  ON CONFLICT (salon_id, date) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    successful_transactions = EXCLUDED.successful_transactions,
    failed_transactions = EXCLUDED.failed_transactions,
    refunded_transactions = EXCLUDED.refunded_transactions,
    total_volume = EXCLUDED.total_volume,
    refunded_volume = EXCLUDED.refunded_volume,
    processing_fees = EXCLUDED.processing_fees,
    platform_fees = EXCLUDED.platform_fees,
    average_transaction_value = EXCLUDED.average_transaction_value,
    success_rate = EXCLUDED.success_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE refunds IS 'Stores all refund transactions';
COMMENT ON TABLE payment_disputes IS 'Stores payment disputes and chargebacks';
COMMENT ON TABLE payment_methods IS 'Stored payment methods for customers';
COMMENT ON TABLE payment_analytics IS 'Aggregated daily payment analytics per salon';
COMMENT ON TABLE payment_events IS 'Audit log for all payment-related events and webhooks';
COMMENT ON TABLE gateway_health IS 'Health monitoring for payment gateways';

COMMENT ON COLUMN payments.platform_fee_amount IS 'Platform fee deducted from payment';
COMMENT ON COLUMN payments.transfer_id IS 'Stripe transfer ID for salon payout';
COMMENT ON COLUMN payments.reconciliation_status IS 'Whether payment has been reconciled with gateway';
