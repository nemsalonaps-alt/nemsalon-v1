# Architecture Overview

**Projekt:** NemSalon - Salon management system
**Arkitektur:** Modular monolith (ikke microservices i v1)

## System Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web App       │     │   Mobile App    │     │  Platform Admin │
│   (React)       │     │   (React Native)│     │   (Internal)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │     API (Hono/Fastify)   │
                    │  apps/api/src/modules/   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │      Supabase           │
                    │   (Postgres + Auth)     │
                    └─────────────────────────┘
```

## Module Structure

Alle backend features følger samme lag-arkitektur:

```
modules/<module>/
├── api/      → HTTP endpoints (validering, ingen business logic)
├── service/  → Use cases, orchestration
├── domain/   → Pure domain logic (ingen DB, ingen HTTP)
└── repo/     → Database access (Supabase/Postgres)
```

### Dependency Rules (STRIKT)

```
domain/   → ingen imports fra api/ eller repo/
service/  → må importere domain/ + repo/
api/      → må kun importere service/
```

## Module Oversigt

| Modul | Ansvar | Kritisk |
|-------|--------|---------|
| `auth` | Bruger login/signup, sessions | ✅ |
| `staff-auth` | Medarbejder login, rolle verificering | ✅ |
| `content` | Salon, services, staff, availability | ✅ |
| `booking` | Booking CRUD, overlap prevention | ✅ |
| `payments` | Stripe integration, webhooks | ✅ |
| `public` | Public API til kunde booking | ✅ |
| `notifications` | Email/SMS outbox pattern | |
| `audit` | Audit logging | |
| `platform` | Platform admin read-only API | |
| `admin` | System admin operationer | |
| `users` | Bruger management | |
| `availability` | Ledige tider beregning | |
| `events` | Event streaming (intern) | |
| `observability` | Logging, metrics, tracing | |

## Data Flow: Booking Med Betaling

```
[Kunde] → [Web Public Booking]
              │
              ↓
        POST /v1/public/bookings
              │
              ↓
        [public module] → opret booking (pending)
              │
              ↓
        POST /v1/payments/checkout
              │
              ↓
        [payments module] → Stripe Checkout URL
              │
              ↓
        [Stripe] ← kunde betaler
              │
              ↓
        webhook: payment_intent.succeeded
              │
              ↓
        [payments module] → opdater booking status (confirmed)
              │
              ↓
        [notifications module] → email/SMS bekræftelse
```

## Tech Stack

| Komponent | Teknologi |
|-----------|-----------|
| Frontend | React + Vite + Tailwind + shadcn/ui |
| Mobile | React Native |
| Backend | Hono (eller Fastify) + TypeScript |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| Betaling | Stripe |
| SMS | Twilio |
| Email | Postmark |
| Hosting | TBD (Netlify/Vercel for web) |

## Kritiske Infrastruktur Beslutninger

1. **Modular monolith** - separate moduler, én deploy unit
2. **Supabase** - managed Postgres + Auth
3. **Stripe-only** - ingen MobilePay i v1
4. **Outbox pattern** - notifikationer skrives til DB først, sendes async
5. **Audit logging** - alle kritiske handlinger logges

## API Konventioner

- **Versioning:** Alle endpoints under `/v1/`
- **OpenAPI:** `docs/openapi-v1.yaml` er source of truth
- **Fejl format:** `{ code, message, details, traceId }`
- **Auth:** JWT tokens, rolle-baseret adgangskontrol

## Development

```bash
# Setup
pnpm install
pnpm supabase:start
pnpm supabase:migrate
pnpm generate:sdk

# Dev
pnpm dev:api
pnpm dev:web

# Test
pnpm test
pnpm test:integration
```

## Quick Links

- [AI Rules](../../.ai-rules.md) - Non-negotiable regler
- [Project Constitution](../../README.md) - Scope, MVP, non-goals
- [OpenAPI Spec](../openapi-v1.yaml)
- [Supabase Migrations](../../supabase/migrations/)

---

*Opdateres når arkitektur ændres*
