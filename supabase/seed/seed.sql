do $$
declare
  salon_id uuid;
  staff_id uuid;
  service_id uuid;
  customer_id uuid;
begin
  insert into salons (name, slug, timezone, phone, email)
  values ('Demo Salon', 'demo-salon', 'Europe/Copenhagen', '+45 12 34 56 78', 'demo@nemsalon.dk')
  on conflict (slug)
  do update set name = excluded.name
  returning id into salon_id;

  insert into staff_profiles (salon_id, display_name, role, email, phone)
  values (salon_id, 'Demo Stylist', 'staff', 'stylist@nemsalon.dk', '+45 98 76 54 32')
  returning id into staff_id;

  insert into services (salon_id, name, description, duration_minutes, price_amount, currency)
  values (salon_id, 'Klip & styling', 'Standard dame/herre klipning', 60, 45000, 'DKK')
  returning id into service_id;

  insert into customers (salon_id, name, email, phone, notes)
  values (salon_id, 'Demo Kunde', 'kunde@nemsalon.dk', '+45 11 22 33 44', 'Seed customer')
  returning id into customer_id;

  insert into bookings (
    salon_id,
    customer_id,
    staff_id,
    service_id,
    start_time,
    end_time,
    status,
    total_amount,
    currency,
    notes
  )
  values (
    salon_id,
    customer_id,
    staff_id,
    service_id,
    now() + interval '1 day',
    now() + interval '1 day' + interval '1 hour',
    'pending',
    45000,
    'DKK',
    'Seed booking'
  );
end $$;
