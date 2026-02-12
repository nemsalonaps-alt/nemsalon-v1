# Payments Module

**Ansvar:** Håndtering af alle betalinger via Stripe - checkout sessions, webhooks, payment intents, og refund.

## Scope (v1)

**Gør:**
- Stripe Checkout integration for online betaling
- Webhook håndtering med signatur verificering
- Idempotent webhook processing
- Payment status tracking
- Refund håndtering

**Gør IKKE:**
- MobilePay (ikke i v1)
- Subscriptions/recurring payments
- Split payments / multi-party payouts

## Arkitektur

```
api/           → REST endpoints for checkout & webhooks
domain/        → Payment domain types & rules
repo/          → Database access for payments
types/         → TypeScript type definitions
```

## Nøgle-filer

| Fil | Formål |
|-----|--------|
| `service/payment-service.ts` | Checkout creation, webhook handling, refund logic |
| `service/payment-webhook-service.ts` | Stripe webhook processing & idempotency |
| `domain/payment-domain.ts` | Payment status transitions, validation rules |
| `repo/payment-repo.ts` | DB queries for payment records |
| `api/payment-api.ts` | Checkout endpoints, webhook endpoint |

## Flow: Booking → Betaling → Bekræftelse

```
1. POST /v1/public/bookings → Opret booking (status: pending)
2. POST /v1/payments/checkout → Stripe Checkout session
3. Stripe webhook → payment_intent.succeeded
4. Webhook handler → Opdater booking status til confirmed
5. BookingConfirmation email/SMS sendes
```

## Kritiske regler

1. **Webhook idempotency:** Samme Stripe event må ikke processeres 2 gange (tjek `stripe_event_id`)
2. **Status separation:** Payment status ≠ Booking status. Booking først confirmed når payment verified.
3. **Signatur verificering:** Alle webhooks skal verificeres med `STRIPE_WEBHOOK_SECRET`
4. **Audit logging:** Alle payment ændringer logges til audit modulet

## Dependencies

**Bruger:**
- `booking` module (opdaterer booking status)
- `notifications` module (sender kvitteringer)
- `audit` module (logger kritiske handlinger)

**Afhenger IKKE af:**
- Andre betalingsproviders
- Subscription management

## Env vars

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_APP_URL=https://...
```

## Testing

Se `apps/api/test/integration/payments/`
- Checkout flow end-to-end
- Webhook idempotency (samme event 2x)
- Invalid webhook signature rejection

## Quick Links

- [OpenAPI spec](../../../docs/openapi-v1.yaml)
- [Stripe docs](https://stripe.com/docs)
- [Integration tests](../../../test/integration/payments/)
