# Roadmap (v1)
Date: 2026-02-02

This roadmap is scoped to the Project Constitution (README.md). No extra scope.

## Phase 0 - Alignment
- [x] Project Constitution (README.md)
- [x] Foundation plan (plans/PROJECT_FOUNDATION.md)
- [x] OpenAPI v1 skeleton (docs/openapi-v1.yaml)
- [x] Confirm providers: payments, SMS, email, push

## Phase 1 - Foundation
- [ ] Modular monolith structure (auth/users/content/payments/notifications/admin)
- [ ] Enforce layering: Routes -> Service -> Domain -> DB
- [ ] Lint/format/typecheck + pre-commit hooks
- [ ] CI pipeline: lint -> tests -> build -> staging deploy

## Phase 2 - Data
- [ ] Postgres schema in supabase/migrations
- [ ] Seed scripts for dev/test
- [ ] Audit log table + critical event capture
- [ ] Events + error_events tables (basic analytics)
- [ ] Soft delete policy for user data

## Phase 3 - Auth
- [ ] Supabase Auth setup + session management
- [ ] Refresh token rotation + device sessions
- [ ] Login rate limiting + verification rules
- [ ] Never-log policy enforced for secrets

## Phase 4 - Core Domain (MVP)
- [ ] Salons, services, staff, customers
- [ ] Booking flow end-to-end (API -> DB)
- [ ] 2-5 integration tests for critical paths

## Phase 5 - Payments (Required)
- [ ] Online checkout provider integrated
- [ ] Payment webhooks + reconciliation
- [ ] Receipts + status tracking

### Payments polish (v1)

Goals
- [ ] Booking ↔ payment mapping is always correct and tenant-scoped
- [ ] Idempotent checkout creation (no double charge on retry/refresh)
- [ ] Webhooks are deterministic + safe to replay
- [ ] Refund flow is consistent + auditable
- [ ] Support/debug can resolve “paid vs not paid” in under a minute

Canonical payment model (payments table)
- id (uuid)
- salon_id (uuid)
- booking_id (uuid) UNIQUE (1 payment per booking in v1)
- provider = stripe
- stripe_checkout_session_id (nullable)
- stripe_payment_intent_id (nullable)
- amount_minor (int)
- currency (ISO-4217)
- status enum: created → requires_action → processing → succeeded → failed → refunded → canceled
- idempotency_key (string)
- created_at, updated_at
- constraints: CHECK(amount_minor >= 0), CHECK(currency ~ '^[A-Z]{3}$')

Idempotency
- POST /v1/bookings/{id}/checkout: “get or create” session
- If already paid → return already_paid
- If active checkout exists → return same URL
- Otherwise create new checkout and store ids
- Use server-generated idempotency key for Stripe and store it

Booking ↔ payment state
- Booking: draft → pending_payment → confirmed → cancelled
- Payment: created → processing → succeeded → failed → refunded → canceled
- When checkout created: booking → pending_payment
- When webhook paid: payment → succeeded, booking → confirmed
- Refund policy: v1 = refund sets payment refunded, booking cancelled (or choose explicit policy)

Webhook robustness
- Map by payment_intent_id / checkout_session_id
- Fallback via metadata.bookingId + metadata.salonId
- Store orphaned events for support if no match
- Idempotent per event id and per state

Reconciliation (manual/cron)
- Find pending payments > X minutes
- Query Stripe status, update DB if mismatch

Refunds (v1)
- POST /v1/payments/{id}/refund
- Must be idempotent: already_refunded returns gracefully
- Audit log event for refund

Support/debug surface
- GET /v1/bookings/{id} includes payment summary
- GET /v1/payments/{id} includes provider ids + status
- Audit events: payment.checkout_created, payment.succeeded, payment.failed, payment.refunded, booking.confirmed

Decisions (v1)
- Model: full prepay via Stripe Checkout
- Cancellation: manual refund (no auto-refund)
- Provider abstraction: keep provider-specific ids nullable

Tests (must-have)
- Double checkout call returns same session URL
- Webhook event replay is idempotent
- Payment succeeded confirms booking exactly once
- Refund updates payment + booking policy
- Cross-tenant refund forbidden

## Phase 6 - Mobile Parity
- [ ] API client generated from OpenAPI
- [ ] Mobile auth + secure storage
- [ ] Core UI components parity (modal/toast/loading/empty/error)
- [ ] Push device registry endpoint (even if push is later)

## Phase 7 - Observability
- [ ] Structured JSON logs
- [ ] traceId/requestId propagation
- [ ] Error tracking (Sentry or equivalent)
- [ ] /health and /ready endpoints
- [ ] Platform admin (read-only) under /v1/platform/*
- [ ] Error rate queries (error_events)

## Phase 8 - Launch Readiness
- [ ] Staging deploy running with migrations
- [ ] Production promote process
- [ ] GDPR flows (export/delete/consent)
- [ ] Go-live checklist
