-- Remove MobilePay as a payments provider (Stripe-only in V1).

do $$
declare
  constraint_name text;
begin
  if exists (select 1 from information_schema.columns where table_name = 'payments' and column_name = 'provider') then
    update payments set provider = 'stripe' where provider = 'mobilepay';
  end if;

  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%provider%';

  if constraint_name is not null then
    execute format('alter table payments drop constraint %I', constraint_name);
  end if;
end $$;

alter table payments
  add constraint payments_provider_check
  check (provider in ('stripe'));
