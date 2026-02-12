-- Test data for notification flow verification
-- Run this in Supabase SQL Editor or via: psql -f test-seed.sql

-- Create test salon
INSERT INTO salons (id, name, slug, timezone, locale, currency, status, cancellation_window_minutes, salon_type)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Test Salon København',
  'test-salon-kbh',
  'Europe/Copenhagen',
  'da-DK',
  'DKK',
  'active',
  1440,
  'hair_salon'
)
ON CONFLICT (id) DO UPDATE SET status = 'active';

-- Create test service (haircut, 30 min, 299 kr)
INSERT INTO services (id, salon_id, name, duration_minutes, price, currency, active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440000',
  'Dameklip',
  30,
  29900, -- in øre/smallest unit
  'DKK',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Create test staff member
INSERT INTO staff_profiles (id, salon_id, name, email, role, active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440000',
  'Anna Frisør',
  'anna@test-salon.dk',
  'staff',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Link staff to service
INSERT INTO staff_services (staff_id, service_id)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440001'
)
ON CONFLICT (staff_id, service_id) DO NOTHING;

-- Set business hours (Mon-Fri 9-17, Sat 9-14)
INSERT INTO business_hours (salon_id, day_of_week, enabled, start_time, end_time)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 1, true, '09:00', '17:00'),
  ('550e8400-e29b-41d4-a716-446655440000', 2, true, '09:00', '17:00'),
  ('550e8400-e29b-41d4-a716-446655440000', 3, true, '09:00', '17:00'),
  ('550e8400-e29b-41d4-a716-446655440000', 4, true, '09:00', '17:00'),
  ('550e8400-e29b-41d4-a716-446655440000', 5, true, '09:00', '17:00'),
  ('550e8400-e29b-41d4-a716-446655440000', 6, true, '09:00', '14:00'),
  ('550e8400-e29b-41d4-a716-446655440000', 0, false, NULL, NULL)
ON CONFLICT (salon_id, day_of_week) DO UPDATE SET enabled = EXCLUDED.enabled;

-- Verify data was created
SELECT 'Salon created:' as check_name, name FROM salons WHERE id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 'Service created:', name FROM services WHERE id = '550e8400-e29b-41d4-a716-446655440001'
UNION ALL
SELECT 'Staff created:', name FROM staff_profiles WHERE id = '550e8400-e29b-41d4-a716-446655440002';
