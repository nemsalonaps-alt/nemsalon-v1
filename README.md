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
- Betaling: Stripe + MobilePay (Stripe er default i golden path).
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
pnpm supabase:stop
```

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
- MOBILEPAY_CLIENT_ID (placeholder)
- MOBILEPAY_CLIENT_SECRET (placeholder)
- MOBILEPAY_SUBSCRIPTION_KEY (placeholder)
- MOBILEPAY_WEBHOOK_SECRET (placeholder)

Når du bliver i tvivl, kigger du her.
