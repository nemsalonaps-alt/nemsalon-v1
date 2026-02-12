-- =====================================================
-- NEMSALON STAFF APP - DATABASE SCHEMA
-- =====================================================
-- Complete schema for staff app with earnings, goals,
-- scheduling, and all required features
-- =====================================================

-- =====================================================
-- STAFF PROFILE ENHANCEMENTS
-- =====================================================

ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT NULL;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 40.00;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS default_tip_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'DKK';

-- =====================================================
-- STAFF COMMISSION RATES
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_commission_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    fixed_amount DECIMAL(10,2) DEFAULT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(staff_id, service_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_staff_commission_staff ON staff_commission_rates(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_commission_service ON staff_commission_rates(service_id);

-- =====================================================
-- STAFF EARNINGS TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),
    salon_id UUID NOT NULL,
    
    service_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    total_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'DKK',
    
    status TEXT NOT NULL DEFAULT 'calculated',
    paid_at TIMESTAMPTZ DEFAULT NULL,
    payment_reference TEXT DEFAULT NULL,
    
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_earnings_staff ON staff_earnings(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_earnings_booking ON staff_earnings(booking_id);
CREATE INDEX IF NOT EXISTS idx_staff_earnings_date ON staff_earnings(calculated_at);
CREATE INDEX IF NOT EXISTS idx_staff_earnings_status ON staff_earnings(status);

-- =====================================================
-- STAFF TIPS
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'DKK',
    payment_method TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_tips_staff ON staff_tips(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_tips_booking ON staff_tips(booking_id);
CREATE INDEX IF NOT EXISTS idx_staff_tips_date ON staff_tips(recorded_at);

-- =====================================================
-- STAFF GOALS
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL,
    
    goal_type TEXT NOT NULL DEFAULT 'monthly',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    target_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    target_bookings INTEGER DEFAULT NULL,
    target_hours DECIMAL(5,2) DEFAULT NULL,
    
    status TEXT NOT NULL DEFAULT 'active',
    achieved_at TIMESTAMPTZ DEFAULT NULL,
    
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(staff_id, goal_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_staff_goals_staff ON staff_goals(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_goals_period ON staff_goals(period_start, period_end);

-- =====================================================
-- SHIFT SWAP REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requesting_staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    accepting_staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    
    original_shift_id UUID NOT NULL,
    original_date DATE NOT NULL,
    original_start_time TIME NOT NULL,
    original_end_time TIME NOT NULL,
    
    requested_date DATE NOT NULL,
    requested_start_time TIME NOT NULL,
    requested_end_time TIME NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'pending',
    reason TEXT DEFAULT NULL,
    
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ DEFAULT NULL,
    responded_by UUID DEFAULT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_swap_requesting ON shift_swap_requests(requesting_staff_id);
CREATE INDEX IF NOT EXISTS idx_shift_swap_accepting ON shift_swap_requests(accepting_staff_id);
CREATE INDEX IF NOT EXISTS idx_shift_swap_status ON shift_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_swap_date ON shift_swap_requests(original_date, requested_date);

-- =====================================================
-- STAFF AVAILABILITY PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_availability_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    
    preferred_days TEXT[],
    preferred_shift TEXT NOT NULL DEFAULT 'any',
    max_hours_per_week DECIMAL(5,2) DEFAULT 40,
    min_hours_per_week DECIMAL(5,2) DEFAULT 0,
    unavailable_dates DATE[],
    
    auto_accept_shifts BOOLEAN NOT NULL DEFAULT FALSE,
    notify_new_shifts BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_prefs_staff ON staff_availability_preferences(staff_id);

-- =====================================================
-- STAFF CUSTOMER NOTES
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    note_type TEXT NOT NULL DEFAULT 'general',
    note_content TEXT NOT NULL,
    
    is_important BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(staff_id, customer_id, note_type)
);

CREATE INDEX IF NOT EXISTS idx_staff_notes_staff ON staff_customer_notes(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_notes_customer ON staff_customer_notes(customer_id);

-- =====================================================
-- SUPABASE FUNCTIONS (RPC)
-- =====================================================

-- Get staff dashboard data (earnings, goals, today bookings)
CREATE OR REPLACE FUNCTION get_staff_dashboard(
    p_staff_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_today_start TIMESTAMPTZ;
    v_today_end TIMESTAMPTZ;
    v_month_start TIMESTAMPTZ;
    v_month_end TIMESTAMPTZ;
    v_today_earnings DECIMAL(10,2);
    v_month_earnings DECIMAL(10,2);
    v_today_bookings INTEGER;
    v_month_bookings INTEGER;
    v_goal JSON;
BEGIN
    v_today_start := p_date::TIMESTAMPTZ;
    v_today_end := (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
    v_month_start := date_trunc('month', p_date)::TIMESTAMPTZ;
    v_month_end := (date_trunc('month', p_date) + INTERVAL '1 month')::TIMESTAMPTZ;
    
    SELECT COALESCE(SUM(total_earned), 0), COUNT(*)
    INTO v_today_earnings, v_today_bookings
    FROM staff_earnings
    WHERE staff_id = p_staff_id
      AND calculated_at >= v_today_start
      AND calculated_at < v_today_end
      AND status != 'disputed';
    
    SELECT COALESCE(SUM(total_earned), 0), COUNT(*)
    INTO v_month_earnings, v_month_bookings
    FROM staff_earnings
    WHERE staff_id = p_staff_id
      AND calculated_at >= v_month_start
      AND calculated_at < v_month_end
      AND status != 'disputed';
    
    SELECT get_staff_goal_progress(p_staff_id, 'monthly', p_date) INTO v_goal;
    
    v_result := json_build_object(
        'date', p_date,
        'today_earnings', v_today_earnings,
        'today_bookings', v_today_bookings,
        'month_earnings', v_month_earnings,
        'month_bookings', v_month_bookings,
        'goal', v_goal
    );
    
    RETURN v_result;
END;
$$;

-- Calculate and record staff earning for a booking
CREATE OR REPLACE FUNCTION calculate_and_record_staff_earning(
    p_booking_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking bookings;
    v_staff_id UUID;
    v_service services;
    v_commission_rate DECIMAL(5,2);
    v_amount DECIMAL(10,2);
    v_commission DECIMAL(10,2);
    v_earning_id UUID;
BEGIN
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
    IF v_booking IS NULL THEN
        RETURN json_build_object('error', 'Booking not found');
    END IF;
    
    SELECT staff_id INTO v_staff_id 
    FROM booking_staff 
    WHERE booking_id = p_booking_id 
    LIMIT 1;
    
    IF v_staff_id IS NULL THEN
        v_staff_id := v_booking.staff_id;
    END IF;
    
    SELECT * INTO v_service FROM services WHERE id = v_booking.service_id;
    
    SELECT commission_rate INTO v_commission_rate
    FROM staff_profiles WHERE id = v_staff_id;
    v_commission_rate := COALESCE(v_commission_rate, 40);
    
    SELECT commission_percentage INTO v_commission_rate
    FROM staff_commission_rates
    WHERE staff_id = v_staff_id
      AND service_id = v_booking.service_id
      AND effective_from <= v_booking.start_time
      AND (effective_to IS NULL OR effective_to > v_booking.start_time)
    LIMIT 1;
    
    v_amount := COALESCE(v_booking.total_amount, v_service.price, 0);
    v_commission := ROUND(v_amount * (v_commission_rate / 100), 2);
    
    INSERT INTO staff_earnings (
        booking_id, staff_id, service_id, salon_id,
        service_amount, commission_percentage, commission_amount, total_earned, currency
    ) VALUES (
        p_booking_id, v_staff_id, v_booking.service_id, v_booking.salon_id,
        v_amount, v_commission_rate, v_commission, v_commission, COALESCE(v_booking.currency, 'DKK')
    )
    RETURNING id INTO v_earning_id;
    
    RETURN json_build_object(
        'earning_id', v_earning_id,
        'staff_id', v_staff_id,
        'amount', v_commission,
        'currency', COALESCE(v_booking.currency, 'DKK')
    );
END;
$$;

-- Get staff earnings summary
CREATE OR REPLACE FUNCTION get_staff_earnings_summary(
    p_staff_id UUID,
    p_date_from DATE,
    p_date_to DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_earnings DECIMAL(10,2);
    v_total_tips DECIMAL(10,2);
    v_booking_count INTEGER;
    v_result JSON;
BEGIN
    SELECT 
        COALESCE(SUM(e.commission_amount), 0),
        COALESCE(SUM(t.amount), 0),
        COUNT(DISTINCT e.booking_id)
    INTO v_total_earnings, v_total_tips, v_booking_count
    FROM staff_earnings e
    LEFT JOIN staff_tips t ON e.booking_id = t.booking_id AND e.staff_id = t.staff_id
    WHERE e.staff_id = p_staff_id
      AND e.calculated_at >= p_date_from::TIMESTAMPTZ
      AND e.calculated_at <= (p_date_to + INTERVAL '1 day')::TIMESTAMPTZ
      AND e.status != 'disputed';
    
    v_result := json_build_object(
        'staff_id', p_staff_id,
        'period_from', p_date_from,
        'period_to', p_date_to,
        'total_earnings', v_total_earnings,
        'total_tips', v_total_tips,
        'total_bookings', v_booking_count
    );
    
    RETURN v_result;
END;
$$;

-- Get staff goal progress
CREATE OR REPLACE FUNCTION get_staff_goal_progress(
    p_staff_id UUID,
    p_goal_type TEXT DEFAULT 'monthly',
    p_current_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_goal staff_goals;
    v_earnings DECIMAL(10,2);
    v_bookings INTEGER;
    v_progress DECIMAL(5,2);
    v_result JSON;
BEGIN
    SELECT * INTO v_goal
    FROM staff_goals
    WHERE staff_id = p_staff_id
      AND goal_type = p_goal_type
      AND p_current_date >= period_start
      AND p_current_date <= period_end
      AND status = 'active'
    LIMIT 1;
    
    IF v_goal IS NULL THEN
        RETURN json_build_object(
            'has_goal', FALSE,
            'message', 'No active goal found'
        );
    END IF;
    
    SELECT 
        COALESCE(SUM(e.commission_amount + t.amount), 0),
        COUNT(DISTINCT e.booking_id)
    INTO v_earnings, v_bookings
    FROM staff_earnings e
    LEFT JOIN staff_tips t ON e.booking_id = t.booking_id AND e.staff_id = t.staff_id
    WHERE e.staff_id = p_staff_id
      AND e.calculated_at >= v_goal.period_start::TIMESTAMPTZ
      AND e.calculated_at <= v_goal.period_end::TIMESTAMPTZ;
    
    v_progress := CASE 
        WHEN v_goal.target_amount > 0 
        THEN LEAST(ROUND((v_earnings / v_goal.target_amount) * 100, 2), 100)
        ELSE 0 
    END;
    
    v_result := json_build_object(
        'goal_id', v_goal.id,
        'staff_id', p_staff_id,
        'target_amount', v_goal.target_amount,
        'current_amount', v_earnings,
        'target_bookings', v_goal.target_bookings,
        'current_bookings', v_bookings,
        'progress_percentage', v_progress,
        'remaining_amount', GREATEST(v_goal.target_amount - v_earnings, 0),
        'status', CASE 
            WHEN v_earnings >= v_goal.target_amount THEN 'achieved'
            WHEN p_current_date > v_goal.period_end THEN 'missed'
            ELSE 'active'
        END,
        'goal_type', v_goal.goal_type,
        'period_start', v_goal.period_start,
        'period_end', v_goal.period_end
    );
    
    RETURN v_result;
END;
$$;

-- Create staff goal
CREATE OR REPLACE FUNCTION create_staff_goal(
    p_staff_id UUID,
    p_salon_id UUID,
    p_goal_type TEXT,
    p_period_start DATE,
    p_period_end DATE,
    p_target_amount DECIMAL(10,2),
    p_target_bookings INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_goal_id UUID;
BEGIN
    INSERT INTO staff_goals (
        staff_id, salon_id, goal_type, period_start, period_end,
        target_amount, target_bookings, notes
    ) VALUES (
        p_staff_id, p_salon_id, p_goal_type, p_period_start, p_period_end,
        p_target_amount, p_target_bookings, p_notes
    )
    RETURNING id INTO v_goal_id;
    
    RETURN json_build_object('goal_id', v_goal_id, 'status', 'created');
END;
$$;

-- Create shift swap request
CREATE OR REPLACE FUNCTION create_shift_swap_request(
    p_requesting_staff_id UUID,
    p_original_shift_id UUID,
    p_original_date DATE,
    p_original_start TIME,
    p_original_end TIME,
    p_requested_date DATE,
    p_requested_start TIME,
    p_requested_end TIME,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_swap_id UUID;
BEGIN
    INSERT INTO shift_swap_requests (
        requesting_staff_id, original_shift_id, original_date,
        original_start_time, original_end_time, requested_date,
        requested_start_time, requested_end_time, reason
    ) VALUES (
        p_requesting_staff_id, p_original_shift_id, p_original_date,
        p_original_start, p_original_end, p_requested_date,
        p_requested_start, p_requested_end, p_reason
    )
    RETURNING id INTO v_swap_id;
    
    RETURN json_build_object('swap_id', v_swap_id, 'status', 'pending');
END;
$$;

-- Get today's bookings for staff
CREATE OR REPLACE FUNCTION get_staff_today_bookings(
    p_staff_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_agg(
            json_build_object(
                'id', b.id,
                'customer_name', c.name,
                'service_name', s.name,
                'start_time', b.start_time,
                'end_time', b.end_time,
                'status', b.status,
                'total_amount', b.total_amount,
                'currency', b.currency
            )
        )
        FROM bookings b
        JOIN booking_staff bs ON b.id = bs.booking_id
        JOIN customers c ON b.customer_id = c.id
        JOIN services s ON b.service_id = s.id
        WHERE bs.staff_id = p_staff_id
          AND b.start_time >= p_date::TIMESTAMPTZ
          AND b.start_time < (p_date + INTERVAL '1 day')::TIMESTAMPTZ
        ORDER BY b.start_time
    );
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-calculate earnings when booking is completed
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
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        SELECT staff_id INTO v_staff_id 
        FROM booking_staff 
        WHERE booking_id = NEW.id 
        LIMIT 1;
        
        IF v_staff_id IS NULL THEN
            v_staff_id := NEW.staff_id;
        END IF;
        
        SELECT COALESCE(commission_rate, 40) INTO v_commission_rate
        FROM staff_profiles WHERE id = v_staff_id;
        
        v_commission_amount := ROUND(COALESCE(NEW.total_amount, 0) * (v_commission_rate / 100), 2);
        
        INSERT INTO staff_earnings (
            booking_id, staff_id, service_id, salon_id,
            service_amount, commission_percentage, commission_amount, total_earned, currency
        ) VALUES (
            NEW.id, v_staff_id, NEW.service_id, NEW.salon_id,
            COALESCE(NEW.total_amount, 0), v_commission_rate, v_commission_amount,
            v_commission_amount, COALESCE(NEW.currency, 'DKK')
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER IF NOT EXISTS calculate_earnings_on_booking_complete
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_earnings_on_booking_complete();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE IF EXISTS staff_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_availability_preferences ENABLE ROW LEVEL SECURITY;

-- Staff can only see their own data
CREATE POLICY IF NOT EXISTS "Staff can view own earnings" ON staff_earnings
    FOR SELECT USING (auth.uid()::TEXT = staff_id::TEXT);

CREATE POLICY IF NOT EXISTS "Staff can view own tips" ON staff_tips
    FOR SELECT USING (auth.uid()::TEXT = staff_id::TEXT);

CREATE POLICY IF NOT EXISTS "Staff can view own goals" ON staff_goals
    FOR SELECT USING (auth.uid()::TEXT = staff_id::TEXT);

CREATE POLICY IF NOT EXISTS "Staff can view own swap requests" ON shift_swap_requests
    FOR SELECT USING (
        auth.uid()::TEXT = requesting_staff_id::TEXT 
        OR auth.uid()::TEXT = accepting_staff_id::TEXT
    );

CREATE POLICY IF NOT EXISTS "Staff can manage own notes" ON staff_customer_notes
    FOR ALL USING (auth.uid()::TEXT = staff_id::TEXT);

CREATE POLICY IF NOT EXISTS "Staff can manage own preferences" ON staff_availability_preferences
    FOR ALL USING (auth.uid()::TEXT = staff_id::TEXT);

-- =====================================================
-- SAMPLE DATA (DEV ONLY)
-- =====================================================

/*
-- Enable for development/testing only
INSERT INTO staff_commission_rates (staff_id, service_id, commission_percentage) VALUES
    ('staff-uuid-1', 'service-haircut-uuid', 40.00),
    ('staff-uuid-1', 'service-color-uuid', 45.00),
    ('staff-uuid-1', 'service-treatment-uuid', 50.00);

INSERT INTO staff_goals (staff_id, salon_id, goal_type, period_start, period_end, target_amount) VALUES
    ('staff-uuid-1', 'salon-uuid-1', 'monthly', '2026-02-01', '2026-02-28', 15000);
*/
