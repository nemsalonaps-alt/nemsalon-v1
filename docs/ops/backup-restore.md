# Backup & Restore Checklist (v1)

## Goal
Be able to restore the database to a clean environment at least once per month.

## Supabase (managed)
1) Take a backup:
   - Supabase Dashboard → Database → Backups → Create snapshot.
2) Restore to a fresh project:
   - Create a new Supabase project.
   - Restore from snapshot.
3) Verify:
   - Run migrations (if needed).
   - Smoke test the API `/readyz`.

## Local Postgres (pg_dump)
1) Backup:
```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup.dump
```

2) Restore (fresh DB):
```bash
createdb nemsalon_restore
pg_restore --dbname=nemsalon_restore backup.dump
```

3) Verify:
```sql
select count(*) from salons;
```

## Monthly drill
- Restore to a fresh DB.
- Run migrations.
- Validate a core flow (auth/me, list services, create booking).
