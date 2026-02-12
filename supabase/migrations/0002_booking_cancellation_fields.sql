alter table bookings
  add column if not exists cancel_reason_key text;

alter table bookings
  add column if not exists cancel_note text;

alter table bookings
  add column if not exists cancelled_at timestamptz;
