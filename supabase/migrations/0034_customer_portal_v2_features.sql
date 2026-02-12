-- Migration: Customer Portal v2 Features
-- Created: 2026-02-11
-- Description: Adds favorites, notification settings, and receipts tables

-- ============================================
-- 1. CUSTOMER FAVORITES
-- ============================================

-- Table for storing customer favorite salons
CREATE TABLE IF NOT EXISTS customer_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent duplicate favorites
  UNIQUE(customer_id, salon_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS customer_favorites_customer_idx ON customer_favorites(customer_id);
CREATE INDEX IF NOT EXISTS customer_favorites_salon_idx ON customer_favorites(salon_id);

-- Enable RLS
ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;

-- Policies: Customers can only see/manage their own favorites
CREATE POLICY "Customers can view own favorites" ON customer_favorites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = customer_favorites.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can add own favorites" ON customer_favorites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = customer_favorites.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can remove own favorites" ON customer_favorites
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = customer_favorites.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

-- ============================================
-- 2. CUSTOMER NOTIFICATION SETTINGS
-- ============================================

-- Table for storing customer notification preferences
CREATE TABLE IF NOT EXISTS customer_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Communication channels
  sms_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  
  -- Reminder preferences
  reminder_24h boolean NOT NULL DEFAULT true,
  reminder_1h boolean NOT NULL DEFAULT false,
  
  -- Marketing consent (GDPR)
  marketing_email boolean NOT NULL DEFAULT false,
  marketing_sms boolean NOT NULL DEFAULT false,
  
  -- Required consent (GDPR)
  data_processing_consent boolean NOT NULL DEFAULT true,
  data_processing_consent_at timestamptz NOT NULL DEFAULT now(),
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- One settings per customer
  UNIQUE(customer_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS customer_notification_settings_customer_idx ON customer_notification_settings(customer_id);

-- Enable RLS
ALTER TABLE customer_notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Customers can only see/manage their own settings
CREATE POLICY "Customers can view own notification settings" ON customer_notification_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = customer_notification_settings.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can update own notification settings" ON customer_notification_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = customer_notification_settings.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

-- Auto-create settings when customer is created
CREATE OR REPLACE FUNCTION create_customer_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customer_notification_settings (customer_id)
  VALUES (NEW.id)
  ON CONFLICT (customer_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create settings
DROP TRIGGER IF EXISTS create_customer_notification_settings_trigger ON customers;
CREATE TRIGGER create_customer_notification_settings_trigger
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION create_customer_notification_settings();

-- ============================================
-- 3. CUSTOMER NOTIFICATION HISTORY
-- ============================================

-- Table for storing sent notification history
CREATE TABLE IF NOT EXISTS customer_notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Notification details
  type text NOT NULL CHECK (type IN ('sms', 'email', 'push')),
  purpose text NOT NULL CHECK (purpose IN ('confirmation', 'reminder', 'cancellation', 'update', 'marketing')),
  
  -- Content
  subject text,
  content text,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  error_message text,
  
  -- Provider info
  provider text,
  provider_message_id text,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS customer_notification_history_customer_idx ON customer_notification_history(customer_id);
CREATE INDEX IF NOT EXISTS customer_notification_history_booking_idx ON customer_notification_history(booking_id);
CREATE INDEX IF NOT EXISTS customer_notification_history_status_idx ON customer_notification_history(status);
CREATE INDEX IF NOT EXISTS customer_notification_history_created_idx ON customer_notification_history(created_at DESC);

-- Enable RLS
ALTER TABLE customer_notification_history ENABLE ROW LEVEL SECURITY;

-- Policies: Customers can only see their own history
CREATE POLICY "Customers can view own notification history" ON customer_notification_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = customer_notification_history.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. RECEIPTS
-- ============================================

-- Table for storing receipts/invoices
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Receipt details
  receipt_number text NOT NULL UNIQUE,
  
  -- Amounts
  amount decimal(10,2) NOT NULL,
  vat_amount decimal(10,2) NOT NULL DEFAULT 0,
  vat_rate decimal(5,2) NOT NULL DEFAULT 25.00,
  currency text NOT NULL DEFAULT 'DKK',
  
  -- Payment info
  payment_method text CHECK (payment_method IN ('card', 'mobilepay', 'cash', 'giftcard', 'invoice')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded')),
  paid_at timestamptz,
  
  -- Service details (denormalized for receipt)
  service_name text NOT NULL,
  service_duration integer,
  
  -- PDF storage
  pdf_url text,
  pdf_generated_at timestamptz,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS receipts_booking_idx ON receipts(booking_id);
CREATE INDEX IF NOT EXISTS receipts_customer_idx ON receipts(customer_id);
CREATE INDEX IF NOT EXISTS receipts_salon_idx ON receipts(salon_id);
CREATE INDEX IF NOT EXISTS receipts_payment_idx ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS receipts_number_idx ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS receipts_created_idx ON receipts(created_at DESC);

-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Policies: Customers can only see their own receipts
CREATE POLICY "Customers can view own receipts" ON receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = receipts.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

-- Note: Salon owner policy removed - owner_user_id column doesn't exist on salons table
-- Staff members with admin role can view salon receipts via staff_permissions

-- ============================================
-- 5. FUNCTIONS
-- ============================================

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  year text;
  sequence_num integer;
  new_number text;
BEGIN
  year := to_char(NEW.created_at, 'YYYY');
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receipt_number, '-', 3) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM receipts
  WHERE receipt_number LIKE 'FAK-' || year || '-%';
  
  new_number := 'FAK-' || year || '-' || LPAD(sequence_num::text, 4, '0');
  NEW.receipt_number := new_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate receipt number
DROP TRIGGER IF EXISTS generate_receipt_number_trigger ON receipts;
CREATE TRIGGER generate_receipt_number_trigger
  BEFORE INSERT ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION generate_receipt_number();

-- Function to auto-create receipt when payment succeeds
CREATE OR REPLACE FUNCTION create_receipt_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
  customer_record RECORD;
BEGIN
  -- Only create receipt for successful payments
  IF NEW.status = 'succeeded' AND OLD.status != 'succeeded' THEN
    -- Get booking info
    SELECT b.*, c.id as customer_id, c.salon_id
    INTO booking_record
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    WHERE b.id = NEW.booking_id;
    
    IF FOUND THEN
      INSERT INTO receipts (
        booking_id,
        customer_id,
        salon_id,
        payment_id,
        amount,
        vat_amount,
        vat_rate,
        currency,
        payment_method,
        payment_status,
        paid_at,
        service_name
      ) VALUES (
        booking_record.id,
        booking_record.customer_id,
        booking_record.salon_id,
        NEW.id,
        NEW.amount,
        NEW.amount * 0.20, -- 20% VAT (25% of total is 20% of net)
        25.00,
        NEW.currency,
        CASE NEW.payment_method
          WHEN 'card' THEN 'card'
          ELSE 'card'
        END,
        'succeeded',
        NOW(),
        booking_record.service_name
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create receipt
DROP TRIGGER IF EXISTS create_receipt_on_payment_trigger ON payments;
CREATE TRIGGER create_receipt_on_payment_trigger
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION create_receipt_on_payment();

-- ============================================
-- 6. BACKFILL EXISTING CUSTOMERS
-- ============================================

-- Create notification settings for existing customers
INSERT INTO customer_notification_settings (customer_id, sms_enabled, email_enabled, reminder_24h, reminder_1h, marketing_email, marketing_sms, data_processing_consent)
SELECT 
  id,
  true,  -- sms_enabled
  true,  -- email_enabled
  true,  -- reminder_24h
  false, -- reminder_1h
  false, -- marketing_email
  false, -- marketing_sms
  true   -- data_processing_consent
FROM customers
ON CONFLICT (customer_id) DO NOTHING;

-- Create receipts for existing successful payments
INSERT INTO receipts (
  booking_id,
  customer_id,
  salon_id,
  payment_id,
  amount,
  vat_amount,
  vat_rate,
  currency,
  payment_method,
  payment_status,
  paid_at,
  service_name
)
SELECT 
  b.id,
  c.id,
  c.salon_id,
  p.id,
  p.amount,
  p.amount * 0.20,
  25.00,
  p.currency,
  'card',
  'succeeded',
  p.updated_at,
  s.name
FROM payments p
JOIN bookings b ON b.id = p.booking_id
JOIN customers c ON c.id = b.customer_id
JOIN services s ON s.id = b.service_id
WHERE p.status = 'succeeded'
AND NOT EXISTS (
  SELECT 1 FROM receipts r WHERE r.payment_id = p.id
)
ON CONFLICT (receipt_number) DO NOTHING;
