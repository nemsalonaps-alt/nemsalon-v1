# Project Constitution
Date: 2026-02-02

**Formål**
Gør saloner i stand til at styre bookinger, kalender, kunder og drift i ét enkelt, pålideligt system.

**MVP scope (v1)**
Skal virke:
- Opret salon, services og medarbejdere.
- Kunde-booking + admin-booking i kalenderen.
- Kundeprofil med historik og noter.
- Online checkout med betaling og kvittering.
- Notifikationer via email/SMS (enkelt niveau).
- Rollebaseret login (owner/admin/staff).
- Mobil app: manglende kernekomponenter fra appen skal fungere i v1.

Må ikke bygges endnu:
- Marketplace, white-label eller multi-brand.
- Multi-lokation på tværs af kæder.
- Avanceret marketing/loyalty/automation.
- Kompleks lagerstyring.
- Realtime kollaboration eller offline-first.

**Explicitly not in V1**
- MobilePay (Stripe-only i v1).

**Non-goals**
- Ingen microservices i v1.
- Ingen "feature factory" før kerneflow er solidt.
- Ingen custom integrations før stabil API v1.

**Succes-metrics (v1)**
- Tid til første booking < 10 min efter onboarding.
- >=30% af nye saloner laver >=5 bookinger i uge 1.
- <=1% kritiske fejl i bookingflow pr. måned.

**Kritiske krav**
- Login: Ja (rollebaseret, sikre sessions).
- Betaling: Ja (fuld online checkout).
- Offline: Nej.
- Push: Nej i v1 (email/SMS er nok).
- GDPR: Ja (samtykke, sletning, eksport, audit-log).

**Providers (låst for v1)**
- Betaling: Stripe.
- SMS: Twilio.
- Email: Postmark.
- Push: FCM (device registry nu, udsendelse senere).
- DB/Auth: Supabase (Postgres + Auth).

**Decision log (låst)**
- Module root: apps/api/src/modules/<module>/{api,service,domain,repo}.
- Money model: integer minor units + currency (ISO-4217).
- Integration tests: én suite i apps/api/test/integration.
- SDK generator: openapi-typescript (types only).
- Runtime client: custom fetch wrapper i packages/sdk/src/client.ts.
- 2026-02-03: Stripe integration test verified (webhook signature + idempotency + booking confirmation).

**Local dev (robust)**
```bash
pnpm install
pnpm supabase:start
pnpm supabase:migrate
pnpm generate:sdk
pnpm test
pnpm dev:worker
pnpm supabase:stop
```

**Local login (Supabase)**
- Åbn Supabase Studio (local) → Auth → Users → "Add user".
- Sæt email + password.
- Hvis user er unconfirmed: klik "Confirm".
- Log ind i web appen.

**Dev bypass (kun lokalt)**
- Sæt `VITE_DEV_USER_ID` i repo root `.env.local` for at skippe login i dev.
- Fjern `VITE_DEV_USER_ID` for at teste rigtig login.

**Env (lokalt)**
- Web læser `VITE_*` fra repo root `.env.local`.
- API læser `.env` og `.env.local` fra repo root (via dotenv).
- `VITE_PUBLIC_APP_URL` kan sættes for public booking links (fallback = browser origin).

**Env vars (server)**
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM
- POSTMARK_SERVER_TOKEN
- POSTMARK_FROM
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- FCM_SERVICE_ACCOUNT_JSON (placeholder)
- PLATFORM_ADMIN_EMAILS (comma-separated allowlist)
- PLATFORM_ADMIN_TOKEN (shared token for internal tools)
- PUBLIC_APP_URL (allowed return URL base for public checkout redirects)
- FEATURE_AVAILABILITY (set to false to disable)
- FEATURE_NOTIFICATIONS (set to false to disable)

**Platform admin (intern ops)**
Platform admin er et separat spor fra owner/admin/staff. Det er kun til support/ops og har sit eget namespace.

Auth (v1):
- Allowlist via `PLATFORM_ADMIN_EMAILS` (comma-separated emails), eller
- Shared token via header `x-platform-admin-token` = `PLATFORM_ADMIN_TOKEN`

API namespace (read-only v1):
- `GET /v1/platform/salons`
- `GET /v1/platform/salons/:salonId`
- `GET /v1/platform/salons/:salonId/bookings`
- `GET /v1/platform/salons/:salonId/payments`
- `GET /v1/platform/audit`

Alle platform-admin kald audit-logges med action `platform.read`.

**Ops docs**
- `docs/ops/analytics.md` (events + error queries)
- `docs/ops/backup-restore.md` (backup/restore checklist)

Når du bliver i tvivl, kigger du her.
