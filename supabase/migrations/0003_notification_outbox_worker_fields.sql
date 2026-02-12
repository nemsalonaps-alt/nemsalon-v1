do $$ begin
  if exists (select 1 from pg_type where typname = 'notification_status') then
    if not exists (
      select 1
      from pg_enum
      where enumlabel = 'processing'
        and enumtypid = 'notification_status'::regtype
    ) then
      alter type notification_status add value 'processing';
    end if;
  end if;
end $$;

do $$ begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'notification_outbox'
      and column_name = 'template'
  ) then
    alter table notification_outbox rename column template to type;
  end if;
end $$;

alter table notification_outbox
  add column if not exists attempts integer not null default 0,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text;

alter table notification_outbox
  alter column next_attempt_at set default now();

update notification_outbox
  set next_attempt_at = created_at
  where next_attempt_at is null;
