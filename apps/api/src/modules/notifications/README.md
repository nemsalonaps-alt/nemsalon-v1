# Notifications Module

**Ansvar:** Asynkron afsendelse af email og SMS notifikationer via outbox pattern.

## Scope (v1)

**Gør:**
- Email via Postmark
- SMS via Twilio
- Outbox pattern (pålidelig levering)
- Template-baserede beskeder med i18n
- Booking confirmation, reminder, cancellation

**Gør IKKE:**
- Push notifications (FCM registrering, men ikke udsendelse)
- Real-time WebSocket beskeder
- Marketing/nyhedsbreve
- Scheduled/recurring beskeder

## Arkitektur

```
api/           → Admin endpoints (resend, status check)
domain/        → Notification types, template struktur
repo/          → Outbox database access
service/       → Queue notifications, template rendering
worker/        → Asynkron afsendelse (email, SMS)
```

## Nøgle-filer

| Fil | Formål |
|-----|--------|
| `service/notifications-service.ts` | Queue beskeder, template rendering |
| `service/templates.ts` | Email/SMS templates med i18n keys |
| `worker/notifications-worker.ts` | Asynkron afsendelse, retry logic |
| `repo/notifications-repo.ts` | Outbox CRUD |
| `domain/notifications-domain.ts` | Typer: Email, SMS, OutboxEntry |

## Outbox Pattern

**Hvorfor:** Sikrer at notifikationer sendes selvom process crasher.

```
1. Booking created
2. notificationsService.queueBookingConfirmation()
3. INSERT INTO notification_outbox (type, payload, status='pending')
4. Worker poller pending rækker
5. Sender via Postmark/Twilio
6. UPDATE status='sent' eller 'failed'
```

## Templates

Alle templates bruger i18n keys, ikke hardcoded tekst.

```typescript
// templates.ts
export const bookingConfirmationEmail = (vars: BookingVars) => ({
  subjectKey: 'email.booking_confirmation.subject',
  bodyKey: 'email.booking_confirmation.body',
  variables: {
    customerName: vars.customerName,
    serviceName: vars.serviceName,
    startTime: vars.startTime,
    // ...
  }
})
```

## Env vars

```bash
POSTMARK_SERVER_TOKEN=...
POSTMARK_FROM=noreply@nemsalon.dk
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+4512345678
```

## Kritiske regler

1. **Aldrig blok main thread:** Brug altid outbox, aldrig direkte API kald
2. **Idempotency:** Samme notification må ikke sendes 2 gange (tjek outbox)
3. **Retry:** Failed beskeder retry 3x med exponential backoff
4. **Secrets:** Log aldrig telefonnumre eller email indhold

## Brug fra andre moduler

```typescript
// content/service/content-service.ts
import { notificationsService } from '../../notifications/service/notifications-service.js'

await notificationsService.queueBookingCancelled({...})
```

Godkendt cross-module dependency - se `docs/architecture/DEPENDENCIES.md`

## Worker Deployment

```bash
# Local
cd apps/api && pnpm worker:notifications

# Production (separate worker process)
node dist/worker/notifications-worker.js
```

## Quick Links

- [Postmark docs](https://postmarkapp.com/developer)
- [Twilio docs](https://www.twilio.com/docs/sms)
- [Outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html)
