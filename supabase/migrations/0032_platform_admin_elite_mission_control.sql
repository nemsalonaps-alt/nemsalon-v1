-- Platform Admin Elite: Phase 1 - Mission Control Schema
-- Migration: 0032_platform_admin_elite_mission_control

-- Platform health metrics (time-series data)
create table if not exists platform_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null,
  metric_value numeric not null,
  unit text,
  labels jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_metrics_name_time 
  on platform_metrics(metric_name, created_at desc);

-- Health check results
create table if not exists platform_health_checks (
  id uuid primary key default gen_random_uuid(),
  check_name text not null,
  status text not null check (status in ('healthy', 'warning', 'critical')),
  message text,
  response_time_ms integer,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_health_checks_name_time 
  on platform_health_checks(check_name, created_at desc);

-- Feature flags for gradual rollouts
create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  enabled boolean not null default false,
  rollout_type text not null check (rollout_type in ('global', 'percentage', 'targeted')),
  rollout_percentage integer check (rollout_percentage between 0 and 100),
  targeted_salon_ids uuid[],
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_feature_flags on feature_flags;
create trigger set_updated_at_feature_flags 
  before update on feature_flags
  for each row execute function set_updated_at();

-- Risk assessment cache for salons
create table if not exists salon_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  risk_score integer not null check (risk_score between 0 and 100),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  factors jsonb not null default '{}',
  last_booking_at timestamptz,
  failed_payments_count integer default 0,
  cancellation_rate numeric(5,2) default 0,
  error_count_24h integer default 0,
  assessed_at timestamptz not null default now(),
  unique(salon_id)
);

create index if not exists idx_salon_risk_level on salon_risk_assessments(risk_level);
create index if not exists idx_salon_risk_score on salon_risk_assessments(risk_score desc);

-- Platform-wide incidents
create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  incident_number text unique not null,
  title text not null,
  description text,
  status text not null check (status in ('open', 'investigating', 'monitoring', 'resolved')),
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  root_cause text,
  resolution text,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_by uuid references users(id),
  resolved_by uuid references users(id)
);

create index if not exists idx_incidents_status on incidents(status);
create index if not exists idx_incidents_severity on incidents(severity);

-- Affected salons per incident
create table if not exists incident_affected_salons (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  salon_id uuid not null references salons(id) on delete cascade,
  impact_description text,
  unique(incident_id, salon_id)
);

-- Incident timeline events
create table if not exists incident_timeline (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  event_type text not null,
  message text not null,
  metadata jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_incident_timeline_incident on incident_timeline(incident_id, created_at desc);

-- Job queue monitoring stats
create table if not exists job_queue_stats (
  id uuid primary key default gen_random_uuid(),
  queue_name text not null,
  pending_count integer not null default 0,
  processing_count integer not null default 0,
  completed_count integer not null default 0,
  failed_count integer not null default 0,
  dead_letter_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_queue_stats_name_time on job_queue_stats(queue_name, created_at desc);

-- Support actions audit log
create table if not exists support_actions (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  salon_id uuid references salons(id),
  target_user_id uuid references users(id),
  target_booking_id uuid references bookings(id),
  performed_by uuid not null references users(id),
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_actions_salon on support_actions(salon_id);
create index if not exists idx_support_actions_performed_by on support_actions(performed_by);
create index if not exists idx_support_actions_created_at on support_actions(created_at desc);

-- Data exports for GDPR/compliance
create table if not exists data_exports (
  id uuid primary key default gen_random_uuid(),
  export_type text not null,
  salon_id uuid references salons(id),
  requested_by uuid not null references users(id),
  status text not null check (status in ('pending', 'processing', 'ready', 'expired')),
  file_url text,
  file_size_bytes integer,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_data_exports_status on data_exports(status);
create index if not exists idx_data_exports_salon on data_exports(salon_id);
create index if not exists idx_data_exports_requested_by on data_exports(requested_by);

-- Function to calculate salon risk score
create or replace function calculate_salon_risk_score(p_salon_id uuid)
returns integer as $$
declare
  v_score integer := 0;
  v_last_booking timestamptz;
  v_failed_payments integer;
  v_total_bookings integer;
  v_cancelled_bookings integer;
  v_error_count integer;
begin
  -- Check last booking (30 days = +30 points)
  select max(start_time) into v_last_booking
  from bookings
  where salon_id = p_salon_id
  and start_time < now();
  
  if v_last_booking is null or v_last_booking < now() - interval '30 days' then
    v_score := v_score + 30;
  elsif v_last_booking < now() - interval '14 days' then
    v_score := v_score + 15;
  end if;
  
  -- Check failed payments (>10% = +25 points)
  select 
    count(*) filter (where status = 'failed'),
    count(*)
  into v_failed_payments, v_total_bookings
  from payments p
  join bookings b on b.id = p.booking_id
  where b.salon_id = p_salon_id
  and p.created_at > now() - interval '30 days';
  
  if v_total_bookings > 0 and (v_failed_payments::numeric / v_total_bookings) > 0.1 then
    v_score := v_score + 25;
  end if;
  
  -- Check cancellation rate (>20% = +20 points)
  select 
    count(*) filter (where status = 'cancelled'),
    count(*)
  into v_cancelled_bookings, v_total_bookings
  from bookings
  where salon_id = p_salon_id
  and created_at > now() - interval '30 days';
  
  if v_total_bookings > 0 and (v_cancelled_bookings::numeric / v_total_bookings) > 0.2 then
    v_score := v_score + 20;
  end if;
  
  -- Check recent errors (>50 in 24h = +25 points)
  select count(*) into v_error_count
  from audit_log
  where salon_id = p_salon_id
  and action like '%error%'
  and created_at > now() - interval '24 hours';
  
  if v_error_count > 50 then
    v_score := v_score + 25;
  elsif v_error_count > 20 then
    v_score := v_score + 10;
  end if;
  
  return least(v_score, 100);
end;
$$ language plpgsql;

-- Function to get risk level from score
create or replace function get_risk_level(p_score integer)
returns text as $$
begin
  return case
    when p_score >= 70 then 'critical'
    when p_score >= 50 then 'high'
    when p_score >= 30 then 'medium'
    else 'low'
  end;
end;
$$ language plpgsql;

-- Function to refresh all salon risk assessments
create or replace function refresh_salon_risk_assessments()
returns void as $$
declare
  r record;
  v_score integer;
  v_level text;
begin
  for r in select id from salons where status = 'active' loop
    v_score := calculate_salon_risk_score(r.id);
    v_level := get_risk_level(v_score);
    
    insert into salon_risk_assessments (
      salon_id, risk_score, risk_level, assessed_at
    ) values (
      r.id, v_score, v_level, now()
    )
    on conflict (salon_id) do update set
      risk_score = excluded.risk_score,
      risk_level = excluded.risk_level,
      assessed_at = excluded.assessed_at;
  end loop;
end;
$$ language plpgsql;
