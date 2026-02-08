# Project Foundation (v1)
Date: 2026-02-02

Source of truth for scope: README.md (Project Constitution).

## 1) Architecture: modular monolith first
- One backend service with clear modules:
  - auth/
  - users/
  - content/ (core domain)
  - payments/
  - notifications/
  - admin/
- Layering rule: Routes -> Service -> Domain -> DB (no domain logic in routes/controllers).
- Dependency rules:
  - domain/ has zero imports from api/ or db/.
  - service/ orchestrates domain + repositories.
  - api/ only validates input and calls service.
- Suggested code layout (example):
  - apps/api/src/modules/<module>/{api,service,domain,repo}

## 2) Contract first: API is truth
- OpenAPI source of truth: docs/openapi-v1.yaml
- Versioning from day 1: /v1/...
- Error format (standard everywhere): code, message, details, traceId
- Pagination: page + limit; return data[] + meta { total, page, limit, totalPages }
- Client generation for mobile: OpenAPI -> typed client
- Backward compatibility: no breaking changes in v1; add new optional fields or new endpoints.

## 3) Data foundation
- Database: Postgres (Supabase).
- Migrations: supabase/migrations (single source of truth).
- Seed: supabase/seed/seed.sql for dev/test.
- Timestamps on all tables: created_at, updated_at.
- Soft delete (user data): deleted_at (where needed).
- Auditing: audit_log table for critical actions (login, role change, payment, booking change).

## 4) Auth from day 1
- Provider: Supabase Auth (OIDC) for JWT sessions.
- Access tokens short TTL; refresh tokens rotated.
- Device sessions for mobile (revoke by device).
- Rate limit login and verification.
- Never log tokens, passwords, or sensitive payloads.

## 5) Non-negotiables in the codebase
- ESLint + Prettier + TypeScript strict.
- Pre-commit hooks: lint + typecheck + unit tests.
- Branch protection: CI green required for merge.
- Conventional commits (optional) + changelog automation.
- Test pyramid:
  - Unit tests on domain/services for critical flows.
  - 2-5 integration tests (DB + API) for booking + payment paths.

## 6) Observability from day 1
- Structured JSON logs.
- requestId/traceId propagated end-to-end.
- Error tracking: Sentry (or equivalent).
- Metrics: latency, error rate, DB connections, queue depth.
- Health endpoints: /health and /ready.

## 7) Environments and secrets
- Environments: dev, staging, prod.
- Config via env vars; secrets stored in a secret manager.
- Feature flags for risky work.
- No .env secrets committed to repo.

## 8) CI/CD minimum
- Pipeline: install deps -> lint -> tests -> build.
- Auto-deploy to staging on green.
- Manual promote to production.
- Run migrations on deploy (guarded).

## 9) Mobile integration + MVP parity
- API client generated from docs/openapi-v1.yaml.
- Secure storage for auth tokens (Keychain/Keystore).
- Caching strategy: services, staff, and bookings with TTL + refresh.
- Device registry endpoint for push tokens.
- MVP mobile parity list (must work):
  - Bottom sheet / modal sheet
  - Toasts (with haptic feedback where supported)
  - Loading skeletons
  - Empty state
  - Error boundary
  - Mobile layout + navigation
- Reference mapping: nemsalon/src/components-new/mobile-wrappers/README.md

## 10) First week plan (no fluff)
Day 1
- README constitution
- Repo setup, lint/format, CI skeleton
- DB choice + migrations

Day 2
- OpenAPI v1 skeleton + error format
- Auth decision + minimal login flow

Day 3
- Core domain model + 1 key use-case end-to-end (API -> DB)
- Integration test for that flow

Day 4
- Observability: logs + Sentry + health endpoints
- Rate limiting + basic security headers

Day 5
- Mobile: API client + login + fetch core data
- Staging deploy running

## 11) Decision log (confirm)
 - Payment provider: Stripe.
- SMS provider: Twilio.
- Email provider: Postmark.
- Push provider: FCM.

## 12) Onboarding v1 funnel (UI + API)
Fokus: Første booking på <10 min

Alt der ikke direkte understøtter dette er out of scope

POS, marketing, loyalty, multi-lokation = senere

Goal: fast first booking with minimal setup. Two required steps, one optional, then CTA.

Entry gate
- If GET /v1/auth/me returns membership + salon, skip onboarding and go to dashboard.
- Else start onboarding.

Step 1: Salon setup (required)
- UI: create salon with name, timezone, locale, currency, business hours.
- Defaults: timezone from browser, locale from browser (en/da), currency default DKK for da-DK else EUR (or choose).
- Validation: name 2-60 chars; timezone IANA; locale string; currency ISO-4217; business hours start < end, at least 1 day.
- API:
  - /v1/auth/me provisions a draft salon for the user (primary salon).
  - PATCH /v1/salons/{id} { name?, timezone?, locale?, currency? }
  - PUT /v1/salons/{id}/business-hours { weekly: [{ day, startTime, endTime, enabled }] }

Step 2: Staff + services (required)
- UI: two cards on one screen.
- Staff card: name, role (owner default), schedule same as salon hours (default on).
- Service card: name, duration min (default 30), price amount (minor units), buffer min (0/5/10/15).
- Assign staff to service (checkbox default on). Require at least 1 staff + 1 service.
- Validation: name 2-60 chars; role enum; duration 5-480; price integer minor units; buffer from allowed list.
- API:
  - POST /v1/staff { name, role } (salon derived from auth context)
  - POST /v1/services { name, durationMinutes, price, currency, bufferMinutes? }
  - POST /v1/staff/{staffId}/services { serviceIds: [] }
  - TODO later: PUT /v1/staff/{staffId}/working-hours (only if custom)

Optional Step 3: Payments setup (optional)
- UI: toggle "Enable online payments now?"
- If off: skip. If on: connect/configure Stripe (can be info-only in v1).
- API: POST /v1/payments/stripe/setup (or store config).

CTA: Create first booking (mini wizard)
- Select/create customer, select service, select staff (filtered by staff_services), select time, confirm.
- Toggles: send email confirmation (default on), send SMS if enabled.
- Validation: staff can perform service; start/end computed (duration + buffer); no overlap.
- API:
  - POST /v1/customers (if new)
  - POST /v1/bookings { salonId, staffId, customerId, startAt, serviceIds, notes? }
  - Optional: POST /v1/bookings/{id}/checkout

Empty states + error UX (v1)
- If no staff/services: show "Complete onboarding" CTA.
- If booking overlap: "Time just got booked - pick another slot."
- If checkout fails: booking stays, payment pending.

Onboarding v1 is done when:

En ny bruger kan oprette salon, staff og service

Brugeren kan lave én bekræftet booking

En email confirmation sendes (SMS hvis plan tillader)

Ingen manuel DB-ændring er nødvendig
