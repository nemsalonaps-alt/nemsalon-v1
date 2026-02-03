drop index if exists payments_active_booking_idx;

create unique index if not exists payments_active_booking_idx
  on payments (booking_id)
  where status in (
    'created',
    'requires_action',
    'processing',
    'pending',
    'paid',
    'succeeded'
  );
