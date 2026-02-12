# Analytics & Error Queries (v1)

## Product events

Time-to-first-booking (login → booking confirmed):
```sql
with login as (
  select user_id, min(created_at) as login_at
  from events
  where event_key = 'auth.login_success'
  group by user_id
),
confirmed as (
  select user_id, min(created_at) as confirmed_at
  from events
  where event_key = 'booking.confirmed'
  group by user_id
)
select
  login.user_id,
  confirmed.confirmed_at - login.login_at as time_to_first_booking
from login
join confirmed on confirmed.user_id = login.user_id
order by time_to_first_booking asc;
```

Drop-offs between onboarding started → completed:
```sql
select
  count(*) filter (where event_key = 'onboarding.started') as started,
  count(*) filter (where event_key = 'onboarding.completed') as completed
from events
where created_at > now() - interval '30 days';
```

## Error rates (top 10 in last 24h)
```sql
select
  error_key,
  count(*) as total
from error_events
where created_at > now() - interval '24 hours'
group by error_key
order by total desc
limit 10;
```

Errors by route + status:
```sql
select
  route,
  status,
  count(*) as total
from error_events
where created_at > now() - interval '24 hours'
group by route, status
order by total desc;
```
