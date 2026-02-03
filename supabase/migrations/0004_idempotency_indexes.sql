alter table bookings
  add column if not exists idempotency_key text;

create unique index if not exists bookings_idempotency_key_idx
  on bookings (salon_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists payments_idempotency_key_idx
  on payments (booking_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists memberships_user_id_idx on memberships (user_id);
create index if not exists users_primary_salon_id_idx on users (primary_salon_id);
create index if not exists staff_services_staff_id_idx on staff_services (staff_id);
