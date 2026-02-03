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

## Phase 8 - Launch Readiness
- [ ] Staging deploy running with migrations
- [ ] Production promote process
- [ ] GDPR flows (export/delete/consent)
- [ ] Go-live checklist
