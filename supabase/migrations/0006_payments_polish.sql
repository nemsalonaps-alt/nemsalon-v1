do $$ begin
  if exists (select 1 from pg_type where typname = 'payment_status') then
    alter type payment_status add value if not exists 'created';
    alter type payment_status add value if not exists 'requires_action';
    alter type payment_status add value if not exists 'processing';
    alter type payment_status add value if not exists 'succeeded';
    alter type payment_status add value if not exists 'canceled';
  end if;
end $$;

alter table payments
  add column if not exists salon_id uuid;

alter table payments
  add column if not exists provider_intent_id text;

update payments
  set salon_id = bookings.salon_id
  from bookings
  where payments.booking_id = bookings.id
    and payments.salon_id is null;

do $$ begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'payments_salon_id_fkey'
  ) then
    alter table payments
      add constraint payments_salon_id_fkey
      foreign key (salon_id) references salons(id) on delete cascade;
  end if;
end $$;

alter table payments
  alter column salon_id set not null;

create index if not exists payments_salon_id_idx on payments (salon_id);
