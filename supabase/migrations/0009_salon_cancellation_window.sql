alter table if exists salons
  add column if not exists cancellation_window_minutes integer not null default 0;
