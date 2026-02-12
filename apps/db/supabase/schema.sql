-- NEMSalon Supabase Schema
-- Owner Console v2 - 5 Section Dashboard
-- Sections: Overview (Dashboard), Calendar, Customers, Services & Team, Money

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
  'cancelled'
);

CREATE TYPE staff_role AS ENUM (
  'owner',
  'admin',
  'staff'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Salons
CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  timezone TEXT DEFAULT 'Europe/Copenhagen',
  locale TEXT DEFAULT 'da',
  currency TEXT DEFAULT 'DKK',
  cancellation_window_minutes INTEGER DEFAULT 120,
  stripe_account_id TEXT,
  stripe_charges_enabled BOOLEAN DEFAULT FALSE,
  stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  sms_consent BOOLEAN DEFAULT FALSE,
  email_consent BOOLEAN DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  total_revenue BIGINT DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  last_booking_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_salon ON customers(salon_id);
CREATE INDEX idx_customers_email ON customers(salon_id, email);
CREATE INDEX idx_customers_phone ON customers(salon_id, phone);

-- Staff
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  role staff_role DEFAULT 'staff',
  active BOOLEAN DEFAULT TRUE,
  color TEXT DEFAULT '#3B82F6',
  commission_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_salon ON staff(salon_id);

-- Services
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  buffer_minutes INTEGER DEFAULT 0,
  price BIGINT NOT NULL,
  currency TEXT DEFAULT 'DKK',
  active BOOLEAN DEFAULT TRUE,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_salon ON services(salon_id);

-- Staff Service Assignments
CREATE TABLE staff_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, service_id)
);

-- Business Hours
CREATE TABLE business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salon_id, day_of_week)
);

-- Staff Working Hours
CREATE TABLE staff_working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, day_of_week)
);

-- Time Off
CREATE TABLE time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  start_utc TIMESTAMPTZ NOT NULL,
  end_utc TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_off_staff ON time_off(staff_id);
CREATE INDEX idx_time_off_dates ON time_off(start_utc, end_utc);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_reference TEXT UNIQUE NOT NULL,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  start_utc TIMESTAMPTZ NOT NULL,
  end_utc TIMESTAMPTZ NOT NULL,
  status booking_status DEFAULT 'pending',
  notes TEXT,
  internal_notes TEXT,
  total_amount BIGINT DEFAULT 0,
  currency TEXT DEFAULT 'DKK',
  payment_id TEXT,
  payment_status payment_status,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_salon ON bookings(salon_id);
CREATE INDEX idx_bookings_staff ON bookings(staff_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_date ON bookings(start_utc);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  provider TEXT DEFAULT 'stripe',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  amount BIGINT NOT NULL,
  currency TEXT DEFAULT 'DKK',
  status payment_status DEFAULT 'pending',
  refunded_amount BIGINT DEFAULT 0,
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_salon ON audit_log(salon_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_log(created_at);

-- =====================================================
-- VIEWS FOR OWNER CONSOLE DASHBOARD (5 SECTIONS)
-- =====================================================

-- SECTION 1: OVERVIEW - Dashboard KPIs View
CREATE VIEW dashboard_kpis AS
SELECT
  s.id AS salon_id,
  s.name AS salon_name,
  s.timezone,
  COUNT(b.id) FILTER (WHERE DATE(b.start_utc AT TIME ZONE s.timezone) = CURRENT_DATE) AS today_bookings,
  COUNT(b.id) FILTER (
    WHERE DATE(b.start_utc AT TIME ZONE s.timezone) = CURRENT_DATE
    AND b.status IN ('completed', 'confirmed')
  ) AS today_completed,
  COUNT(b.id) FILTER (
    WHERE DATE(b.start_utc AT TIME ZONE s.timezone) = CURRENT_DATE
    AND b.status = 'pending'
  ) AS today_pending,
  COALESCE(SUM(b.total_amount) FILTER (
    WHERE DATE(b.start_utc AT TIME ZONE s.timezone) = CURRENT_DATE
    AND b.status NOT IN ('cancelled', 'no_show')
  ), 0) AS today_revenue,
  COALESCE(SUM(b.total_amount) FILTER (
    WHERE DATE(b.start_utc AT TIME ZONE s.timezone) = CURRENT_DATE
    AND b.status = 'confirmed'
  ), 0) AS today_confirmed_revenue,
  COUNT(b.id) FILTER (
    WHERE b.start_utc AT TIME ZONE s.timezone > NOW()
    AND b.status IN ('pending', 'confirmed')
  ) AS upcoming_bookings,
  (SELECT MIN(start_utc) FROM bookings WHERE salon_id = s.id
    AND start_utc AT TIME ZONE s.timezone > NOW()
    AND status IN ('pending', 'confirmed')
  ) AS next_booking,
  COUNT(DISTINCT c.id) AS total_customers,
  COALESCE(SUM(c.total_revenue), 0) AS total_revenue,
  COUNT(b.id) FILTER (WHERE b.status = 'no_show') AS total_no_shows,
  COUNT(b.id) FILTER (
    WHERE b.payment_status IN ('pending', 'failed')
  ) AS pending_payments,
  COUNT(b.id) FILTER (
    WHERE b.status = 'pending'
    AND b.start_utc AT TIME ZONE s.timezone < NOW()
  ) AS overdue_confirmations
FROM salons s
LEFT JOIN bookings b ON b.salon_id = s.id
LEFT JOIN customers c ON c.salon_id = s.id
GROUP BY s.id, s.name, s.timezone;

-- SECTION 2: CALENDAR - Daily Schedule View
CREATE VIEW daily_schedule AS
SELECT
  b.salon_id,
  DATE(b.start_utc AT TIME ZONE s.timezone) AS date,
  b.staff_id,
  st.name AS staff_name,
  st.color,
  b.id,
  b.booking_reference,
  b.start_utc,
  b.end_utc,
  b.status,
  c.name AS customer_name,
  ssvc.name AS service_name,
  b.total_amount,
  b.payment_status
FROM bookings b
JOIN salons s ON b.salon_id = s.id
LEFT JOIN staff st ON b.staff_id = st.id
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN services ssvc ON b.service_id = ssvc.id;

-- SECTION 3: CUSTOMERS - Customer Overview View
CREATE VIEW customer_overview AS
SELECT
  c.id AS customer_id,
  c.salon_id,
  c.name,
  c.email,
  c.phone,
  c.total_revenue,
  c.booking_count,
  c.no_show_count,
  c.last_booking_at,
  c.created_at,
  COALESCE(SUM(b.total_amount) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')), 0) AS lifetime_value,
  COUNT(b.id) FILTER (WHERE b.status = 'completed') AS completed_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'cancelled') AS cancelled_bookings,
  EXTRACT(DAY FROM NOW() - COALESCE(c.last_booking_at, c.created_at)) AS days_since_last_visit
FROM customers c
LEFT JOIN bookings b ON b.customer_id = c.id
GROUP BY c.id, c.salon_id, c.name, c.email, c.phone, c.total_revenue, c.booking_count, c.no_show_count, c.last_booking_at, c.created_at;

-- SECTION 4: SERVICES & TEAM - Staff Performance View
CREATE VIEW staff_performance AS
SELECT
  st.id AS staff_id,
  st.salon_id,
  st.name,
  st.email,
  st.role,
  st.active,
  st.color,
  COUNT(b.id) AS total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'completed') AS completed_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'cancelled') AS cancelled_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'no_show') AS no_shows,
  COUNT(b.id) FILTER (WHERE b.status IN ('pending', 'confirmed') AND b.start_utc > NOW()) AS upcoming_bookings,
  COALESCE(SUM(b.total_amount), 0) AS total_revenue,
  COALESCE(SUM(b.total_amount) FILTER (WHERE b.status = 'completed'), 0) AS completed_revenue,
  COALESCE(SUM(b.total_amount) * st.commission_rate / 100, 0) AS commission
FROM staff st
LEFT JOIN bookings b ON b.staff_id = st.id
GROUP BY st.id, st.salon_id, st.name, st.email, st.role, st.active, st.color, st.commission_rate;

-- Service Performance View
CREATE VIEW service_performance AS
SELECT
  svc.id AS service_id,
  svc.salon_id,
  svc.name,
  svc.duration_minutes,
  svc.price,
  svc.active,
  COUNT(b.id) AS total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'completed') AS completed_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'cancelled') AS cancelled_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'no_show') AS no_shows,
  COALESCE(SUM(b.total_amount), 0) AS total_revenue,
  AVG(b.total_amount) FILTER (WHERE b.status = 'completed') AS avg_revenue
FROM services svc
LEFT JOIN bookings b ON b.service_id = svc.id
GROUP BY svc.id, svc.salon_id, svc.name, svc.duration_minutes, svc.price, svc.active;

-- SECTION 5: MONEY - Revenue Analytics View
CREATE VIEW revenue_analytics AS
SELECT
  s.id AS salon_id,
  s.currency,
  DATE_TRUNC('day', b.start_utc AT TIME ZONE s.timezone) AS date,
  COUNT(b.id) AS booking_count,
  COUNT(b.id) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')) AS valid_bookings,
  COALESCE(SUM(b.total_amount) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')), 0) AS gross_revenue,
  COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status = 'succeeded'), 0) AS collected_revenue,
  COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status = 'pending'), 0) AS pending_revenue,
  COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status = 'failed'), 0) AS failed_revenue,
  COALESCE(SUM(p.refunded_amount), 0) AS refunded_amount,
  COUNT(b.id) FILTER (WHERE b.payment_status = 'succeeded') AS paid_bookings,
  COUNT(b.id) FILTER (WHERE b.payment_status IN ('pending', 'failed')) AS unpaid_bookings
FROM salons s
LEFT JOIN bookings b ON b.salon_id = s.id
LEFT JOIN payments p ON p.booking_id = b.id
GROUP BY s.id, s.currency, DATE_TRUNC('day', b.start_utc AT TIME ZONE s.timezone);

-- Monthly Revenue Summary
CREATE VIEW monthly_revenue AS
SELECT
  s.id AS salon_id,
  DATE_TRUNC('month', b.start_utc AT TIME ZONE s.timezone) AS month,
  COUNT(b.id) AS booking_count,
  COALESCE(SUM(b.total_amount) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')), 0) AS gross_revenue,
  COALESCE(SUM(b.total_amount) FILTER (WHERE b.status = 'completed'), 0) AS completed_revenue,
  COALESCE(SUM(b.total_amount) FILTER (WHERE b.status = 'pending' OR b.status = 'confirmed'), 0) AS expected_revenue
FROM salons s
LEFT JOIN bookings b ON b.salon_id = s.id
GROUP BY s.id, DATE_TRUNC('month', b.start_utc AT TIME ZONE s.timezone);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_salons_timestamp BEFORE UPDATE ON salons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_timestamp BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_staff_timestamp BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_services_timestamp BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_business_hours_timestamp BEFORE UPDATE ON business_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_staff_working_hours_timestamp BEFORE UPDATE ON staff_working_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bookings_timestamp BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_timestamp BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- RLS POLICIES (Row Level Security)
-- =====================================================

ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Salon owners and admins can access their salon data
CREATE POLICY "Owners can manage salons" ON salons
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM staff WHERE salon_id = salons.id AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Staff can view customers" ON customers
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM staff WHERE salon_id = customers.salon_id AND active = TRUE
  ));

CREATE POLICY "Admins can manage customers" ON customers
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM staff WHERE salon_id = customers.salon_id AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Staff can view staff" ON staff
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM staff WHERE salon_id = staff.salon_id AND active = TRUE
  ));

CREATE POLICY "Admins can manage staff" ON staff
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM staff WHERE salon_id = staff.salon_id AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Staff can view services" ON services
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM staff WHERE salon_id = services.salon_id AND active = TRUE
  ));

CREATE POLICY "Admins can manage services" ON services
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM staff WHERE salon_id = services.salon_id AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Staff can view business hours" ON business_hours
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM staff WHERE salon_id = business_hours.salon_id AND id = auth.uid() AND active = TRUE
  ));

CREATE POLICY "Admins can manage business hours" ON business_hours
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM staff WHERE salon_id = business_hours.salon_id AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Staff can view their working hours" ON staff_working_hours
  FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Staff can manage own working hours" ON staff_working_hours
  FOR ALL USING (staff_id = auth.uid());

CREATE POLICY "Staff can view time off" ON time_off
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM staff WHERE salon_id = time_off.salon_id AND id = auth.uid() AND active = TRUE
  ));

CREATE POLICY "Staff can manage own time off" ON time_off
  FOR ALL USING (staff_id = auth.uid());

CREATE POLICY "Staff can view bookings" ON bookings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM staff WHERE salon_id = bookings.salon_id AND id = auth.uid() AND active = TRUE
  ));

CREATE POLICY "Admins can manage bookings" ON bookings
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM staff WHERE salon_id = bookings.salon_id AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Staff can view payments" ON payments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM staff WHERE salon_id = (
      SELECT salon_id FROM bookings WHERE id = payments.booking_id
    ) AND id = auth.uid() AND active = TRUE
  ));

CREATE POLICY "Admins can manage payments" ON payments
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM staff WHERE salon_id = (
      SELECT salon_id FROM bookings WHERE id = payments.booking_id
    ) AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can view audit log" ON audit_log
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM staff WHERE salon_id = audit_log.salon_id AND role IN ('owner', 'admin')
  ));

-- =====================================================
-- EDGE FUNCTIONS (API ENDPOINTS) FOR 5-SECTION CONSOLE
-- =====================================================

-- SECTION 1: OVERVIEW - Dashboard data endpoint
CREATE OR REPLACE FUNCTION api_get_dashboard_data(date_input DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  salon_uuid UUID;
BEGIN
  salon_uuid := (SELECT salon_id FROM staff WHERE id = auth.uid() LIMIT 1);
  
  SELECT json_build_object(
    'kpis', (
      SELECT json_build_object(
        'todayBookings', COUNT(*) FILTER (WHERE DATE(start_utc AT TIME ZONE s.timezone) = date_input),
        'todayCompleted', COUNT(*) FILTER (WHERE DATE(start_utc AT TIME ZONE s.timezone) = date_input AND status IN ('completed', 'confirmed')),
        'todayPending', COUNT(*) FILTER (WHERE DATE(start_utc AT TIME ZONE s.timezone = date_input AND status = 'pending')),
        'todayRevenue', COALESCE(SUM(total_amount) FILTER (WHERE DATE(start_utc AT TIME ZONE s.timezone) = date_input AND status NOT IN ('cancelled', 'no_show')), 0),
        'upcomingBookings', COUNT(*) FILTER (WHERE start_utc > NOW() AND status IN ('pending', 'confirmed')),
        'nextBooking', (SELECT MIN(start_utc) FROM bookings WHERE salon_id = salon_uuid AND start_utc > NOW() AND status IN ('pending', 'confirmed'))
      )
      FROM bookings
      WHERE salon_id = salon_uuid
    ),
    'alerts', (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'type', CASE WHEN payment_status IN ('pending', 'failed') THEN 'payment' ELSE 'booking' END,
          'message', CASE 
            WHEN payment_status = 'pending' THEN 'Betaling afventer for booking ' || booking_reference
            WHEN payment_status = 'failed' THEN 'Betaling fejlede for booking ' || booking_reference
            WHEN status = 'pending' AND start_utc < NOW() THEN 'Afventer bekræftelse for booking ' || booking_reference
            ELSE NULL
          END,
          'bookingId', id,
          'bookingReference', booking_reference,
          'actionLink', '/calendar'
        )
        FILTER (WHERE payment_status IN ('pending', 'failed') OR (status = 'pending' AND start_utc < NOW()))
        FROM bookings
        WHERE salon_id = salon_uuid
      )
    ),
    'systemStatus', (
      SELECT CASE 
        WHEN COUNT(*) FILTER (WHERE payment_status = 'pending' OR payment_status = 'failed') > 0 THEN 'action-required'
        WHEN COUNT(*) FILTER (WHERE status = 'pending' AND start_utc < NOW()) > 0 THEN 'attention'
        ELSE 'healthy'
      END
      FROM bookings
      WHERE salon_id = salon_uuid
    )
  )
  INTO result
  FROM salons s
  WHERE s.id = salon_uuid;

  RETURN result;
END;
$$;

-- SECTION 2: CALENDAR - Get schedule for date range
CREATE OR REPLACE FUNCTION api_get_schedule(start_date DATE, end_date DATE, staff_filter UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  salon_uuid UUID;
BEGIN
  salon_uuid := (SELECT salon_id FROM staff WHERE id = auth.uid() LIMIT 1);
  
  SELECT json_agg(
    json_build_object(
      'id', b.id,
      'bookingReference', b.booking_reference,
      'startTime', b.start_utc,
      'endTime', b.end_utc,
      'status', b.status,
      'customerName', c.name,
      'customerPhone', c.phone,
      'serviceName', ssvc.name,
      'serviceDuration', ssvc.duration_minutes,
      'staffId', b.staff_id,
      'staffName', st.name,
      'staffColor', st.color,
      'totalAmount', b.total_amount,
      'currency', b.currency,
      'paymentStatus', b.payment_status,
      'notes', b.notes
    )
    ORDER BY b.start_utc
  )
  INTO result
  FROM bookings b
  LEFT JOIN customers c ON b.customer_id = c.id
  LEFT JOIN services ssvc ON b.service_id = ssvc.id
  LEFT JOIN staff st ON b.staff_id = st.id
  WHERE b.salon_id = salon_uuid
    AND DATE(b.start_utc AT TIME ZONE (SELECT timezone FROM salons WHERE id = salon_uuid)) BETWEEN start_date AND end_date
    AND (staff_filter IS NULL OR b.staff_id = staff_filter);

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- SECTION 3: CUSTOMERS - Get customers with stats
CREATE OR REPLACE FUNCTION api_get_customers(limit_count INTEGER DEFAULT 100, search_text TEXT DEFAULT '')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  salon_uuid UUID;
BEGIN
  salon_uuid := (SELECT salon_id FROM staff WHERE id = auth.uid() LIMIT 1);
  
  SELECT json_agg(
    json_build_object(
      'id', c.id,
      'name', c.name,
      'email', c.email,
      'phone', c.phone,
      'totalRevenue', c.total_revenue,
      'bookingCount', c.booking_count,
      'noShowCount', c.no_show_count,
      'lastBookingAt', c.last_booking_at,
      'createdAt', c.created_at,
      'lifetimeValue', COALESCE((
        SELECT SUM(b.total_amount) FROM bookings b 
        WHERE b.customer_id = c.id AND b.status NOT IN ('cancelled', 'no_show')
      ), 0),
      'daysSinceLastVisit', EXTRACT(DAY FROM NOW() - COALESCE(c.last_booking_at, c.created_at))
    )
    ORDER BY c.last_booking_at DESC NULLS LAST
    LIMIT limit_count
  )
  INTO result
  FROM customers c
  WHERE c.salon_id = salon_uuid
    AND (search_text = '' OR c.name ILIKE '%' || search_text || '%' OR c.email ILIKE '%' || search_text || '%' OR c.phone ILIKE '%' || search_text || '%');

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- SECTION 3: CUSTOMERS - Get customer details with bookings
CREATE OR REPLACE FUNCTION api_get_customer_details(customer_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'customer', (
      SELECT json_build_object(
        'id', c.id,
        'name', c.name,
        'email', c.email,
        'phone', c.phone,
        'notes', c.notes,
        'smsConsent', c.sms_consent,
        'emailConsent', c.email_consent,
        'marketingConsent', c.marketing_consent,
        'totalRevenue', c.total_revenue,
        'bookingCount', c.booking_count,
        'noShowCount', c.no_show_count,
        'lastBookingAt', c.last_booking_at,
        'createdAt', c.created_at
      )
      FROM customers c WHERE c.id = customer_uuid
    ),
    'stats', (
      SELECT json_build_object(
        'totalBookings', COUNT(b.id),
        'completedBookings', COUNT(b.id) FILTER (WHERE b.status = 'completed'),
        'cancelledBookings', COUNT(b.id) FILTER (WHERE b.status = 'cancelled'),
        'noShowCount', COUNT(b.id) FILTER (WHERE b.status = 'no_show'),
        'totalRevenue', COALESCE(SUM(b.total_amount), 0),
        'completedRevenue', COALESCE(SUM(b.total_amount) FILTER (WHERE b.status = 'completed'), 0),
        'firstBooking', MIN(b.start_utc),
        'lastBooking', MAX(b.start_utc)
      )
      FROM bookings b WHERE b.customer_id = customer_uuid
    ),
    'recentBookings', (
      SELECT json_agg(
        json_build_object(
          'id', b.id,
          'bookingReference', b.booking_reference,
          'startTime', b.start_utc,
          'endTime', b.end_utc,
          'status', b.status,
          'serviceName', s.name,
          'staffName', st.name,
          'totalAmount', b.total_amount,
          'currency', b.currency,
          'paymentStatus', b.payment_status
        )
        ORDER BY b.start_utc DESC
        LIMIT 10
      )
      FROM bookings b
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN staff st ON b.staff_id = st.id
      WHERE b.customer_id = customer_uuid
    )
  )
  INTO result;

  RETURN result;
END;
$$;

-- SECTION 4: SERVICES & TEAM - Get staff with working hours
CREATE OR REPLACE FUNCTION api_get_staff_with_hours()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  salon_uuid UUID;
BEGIN
  salon_uuid := (SELECT salon_id FROM staff WHERE id = auth.uid() LIMIT 1);
  
  SELECT json_agg(
    json_build_object(
      'id', st.id,
      'name', st.name,
      'email', st.email,
      'role', st.role,
      'active', st.active,
      'color', st.color,
      'commissionRate', st.commission_rate,
      'workingHours', (
        SELECT json_agg(
          json_build_object(
            'dayOfWeek', wh.day_of_week,
            'startTime', wh.start_time,
            'endTime', wh.end_time,
            'enabled', wh.enabled
          )
          ORDER BY wh.day_of_week
        )
        FROM staff_working_hours wh
        WHERE wh.staff_id = st.id
      ),
      'services', (
        SELECT json_agg(ssvc.id)
        FROM staff_services ss
        JOIN services ssvc ON ss.service_id = ssvc.id
        WHERE ss.staff_id = st.id
      ),
      'performance', (
        SELECT json_build_object(
          'totalBookings', COUNT(b.id),
          'completedBookings', COUNT(b.id) FILTER (WHERE b.status = 'completed'),
          'totalRevenue', COALESCE(SUM(b.total_amount), 0)
        )
        FROM bookings b
        WHERE b.staff_id = st.id
      )
    )
    ORDER BY st.name
  )
  INTO result
  FROM staff st
  WHERE st.salon_id = salon_uuid;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- SECTION 4: SERVICES & TEAM - Get services with performance
CREATE OR REPLACE FUNCTION api_get_services_with_performance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  salon_uuid UUID;
BEGIN
  salon_uuid := (SELECT salon_id FROM staff WHERE id = auth.uid() LIMIT 1);
  
  SELECT json_agg(
    json_build_object(
      'id', svc.id,
      'name', svc.name,
      'description', svc.description,
      'durationMinutes', svc.duration_minutes,
      'bufferMinutes', svc.buffer_minutes,
      'price', svc.price,
      'currency', svc.currency,
      'active', svc.active,
      'category', svc.category,
      'staff', (
        SELECT json_agg(st.id)
        FROM staff_services ss
        JOIN staff st ON ss.staff_id = st.id
        WHERE ss.service_id = svc.id
      ),
      'performance', (
        SELECT json_build_object(
          'totalBookings', COUNT(b.id),
          'completedBookings', COUNT(b.id) FILTER (WHERE b.status = 'completed'),
          'cancelledBookings', COUNT(b.id) FILTER (WHERE b.status = 'cancelled'),
          'totalRevenue', COALESCE(SUM(b.total_amount), 0)
        )
        FROM bookings b
        WHERE b.service_id = svc.id
      )
    )
    ORDER BY svc.name
  )
  INTO result
  FROM services svc
  WHERE svc.salon_id = salon_uuid;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- SECTION 5: MONEY - Get revenue analytics
CREATE OR REPLACE FUNCTION api_get_revenue_analytics(start_date DATE, end_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  salon_uuid UUID;
BEGIN
  salon_uuid := (SELECT salon_id FROM staff WHERE id = auth.uid() LIMIT 1);
  
  SELECT json_build_object(
    'summary', (
      SELECT json_build_object(
        'grossRevenue', COALESCE(SUM(b.total_amount) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')), 0),
        'collectedRevenue', COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status = 'succeeded'), 0),
        'pendingRevenue', COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status = 'pending'), 0),
        'failedRevenue', COALESCE(SUM(b.total_amount) FILTER (WHERE b.payment_status = 'failed'), 0),
        'refundedAmount', COALESCE((
          SELECT SUM(p.refunded_amount) FROM payments p
          JOIN bookings bb ON p.booking_id = bb.id
          WHERE bb.salon_id = salon_uuid
        ), 0),
        'totalBookings', COUNT(b.id),
        'validBookings', COUNT(b.id) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')),
        'cancelledBookings', COUNT(b.id) FILTER (WHERE b.status = 'cancelled'),
        'noShowBookings', COUNT(b.id) FILTER (WHERE b.status = 'no_show')
      )
      FROM bookings b
      WHERE b.salon_id = salon_uuid
        AND DATE(b.start_utc AT TIME ZONE (SELECT timezone FROM salons WHERE id = salon_uuid)) BETWEEN start_date AND end_date
    ),
    'daily', (
      SELECT json_agg(
        json_build_object(
          'date', DATE(b.start_utc AT TIME ZONE s.timezone),
          'bookings', COUNT(b.id),
          'revenue', COALESCE(SUM(b.total_amount) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')), 0),
          'paidBookings', COUNT(b.id) FILTER (WHERE b.payment_status = 'succeeded'),
          'pendingPayments', COUNT(b.id) FILTER (WHERE b.payment_status = 'pending'),
          'failedPayments', COUNT(b.id) FILTER (WHERE b.payment_status = 'failed')
        )
        ORDER BY DATE(b.start_utc AT TIME ZONE s.timezone)
      )
      FROM bookings b
      JOIN salons s ON b.salon_id = s.id
      WHERE b.salon_id = salon_uuid
        AND DATE(b.start_utc AT TIME ZONE s.timezone) BETWEEN start_date AND end_date
      GROUP BY DATE(b.start_utc AT TIME ZONE s.timezone)
    ),
    'byStaff', (
      SELECT json_agg(
        json_build_object(
          'staffId', b.staff_id,
          'staffName', st.name,
          'bookings', COUNT(b.id),
          'revenue', COALESCE(SUM(b.total_amount) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')), 0)
        )
        ORDER BY COALESCE(SUM(b.total_amount) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show')), 0) DESC
      )
      FROM bookings b
      JOIN staff st ON b.staff_id = st.id
      WHERE b.salon_id = salon_uuid
        AND DATE(b.start_utc AT TIME ZONE (SELECT timezone FROM salons WHERE id = salon_uuid)) BETWEEN start_date AND end_date
      GROUP BY b.staff_id, st.name
    ),
    'stripeStatus', (
      SELECT json_build_object(
        'accountId', s.stripe_account_id,
        'chargesEnabled', s.stripe_charges_enabled,
        'payoutsEnabled', s.stripe_payouts_enabled
      )
      FROM salons s
      WHERE s.id = salon_uuid
    )
  )
  INTO result;

  RETURN result;
END;
$$;

-- SECTION 5: MONEY - Lookup booking by reference
CREATE OR REPLACE FUNCTION api_lookup_booking(reference TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'booking', json_build_object(
      'id', b.id,
      'bookingReference', b.booking_reference,
      'startTime', b.start_utc,
      'endTime', b.end_utc,
      'status', b.status,
      'customerName', c.name,
      'customerEmail', c.email,
      'customerPhone', c.phone,
      'serviceName', ssvc.name,
      'staffName', st.name,
      'totalAmount', b.total_amount,
      'currency', b.currency,
      'paymentStatus', b.payment_status,
      'notes', b.notes
    ),
    'payment', json_build_object(
      'status', b.payment_status,
      'totalAmount', b.total_amount,
      'refundedAmount', COALESCE((
        SELECT SUM(p.refunded_amount) FROM payments p WHERE p.booking_id = b.id
      ), 0)
    )
  )
  INTO result
  FROM bookings b
  LEFT JOIN customers c ON b.customer_id = c.id
  LEFT JOIN services ssvc ON b.service_id = ssvc.id
  LEFT JOIN staff st ON b.staff_id = st.id
  WHERE b.booking_reference = reference;

  RETURN result;
END;
$$;

-- =====================================================
-- SEEDS (Example Data)
-- =====================================================

-- Example business hours for a typical salon
INSERT INTO business_hours (salon_id, day_of_week, start_time, end_time, enabled) VALUES
  (' salon-uuid', 0, '09:00', '17:00', TRUE),
  (' salon-uuid', 1, '09:00', '17:00', TRUE),
  (' salon-uuid', 2, '09:00', '17:00', TRUE),
  (' salon-uuid', 3, '09:00', '17:00', TRUE),
  (' salon-uuid', 4, '09:00', '17:00', TRUE),
  (' salon-uuid', 5, '09:00', '15:00', TRUE),
  (' salon-uuid', 6, '00:00', '00:00', FALSE);

-- =====================================================
-- MIGRATION NOTES - 5-SECTION CONSOLE
-- =====================================================

-- New booking_reference field:
-- ALTER TABLE bookings ADD COLUMN booking_reference TEXT UNIQUE NOT NULL;
-- UPDATE bookings SET booking_reference = CONCAT('BK-', SUBSTRING(id::TEXT, 1, 8)) WHERE booking_reference IS NULL;
-- CREATE UNIQUE INDEX idx_bookings_reference ON bookings(booking_reference);

-- To migrate existing data:
-- 1. Backup current database
-- 2. Run this schema
-- 3. Migrate data from existing tables
-- 4. Add booking_reference to existing bookings
-- 5. Update application code to use new API endpoints
-- 6. Deploy and test

-- Console Section Mapping:
-- Section 1: Overview (Dashboard) -> api_get_dashboard_data()
-- Section 2: Calendar -> api_get_schedule()
-- Section 3: Customers -> api_get_customers(), api_get_customer_details()
-- Section 4: Services & Team -> api_get_staff_with_hours(), api_get_services_with_performance()
-- Section 5: Money -> api_get_revenue_analytics(), api_lookup_booking()
