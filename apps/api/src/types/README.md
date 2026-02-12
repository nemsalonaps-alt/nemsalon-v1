# Database Types Guide

Dette dokument beskriver de genererede Supabase database typer.

## Generering

Typerne er auto-genereret fra din lokale Supabase database. For at regenerere:

```bash
supabase gen types --local --schema public > apps/api/src/types/database.ts
```

Eller fra det linkede (remote) projekt:

```bash
supabase gen types --linked --schema public > apps/api/src/types/database.ts
```

## Brug

### Grundlæggende brug

```typescript
import { Database, Tables, Enums } from './types/database';

// Brug Tables helper til at få Row typen
const salon: Tables<'salons'> = {
  id: 'uuid',
  name: 'My Salon',
  // ... resten af felterne
};

// Brug Enums helper
const status: Enums<'booking_status'> = 'confirmed';
```

### Specifikke type aliases

Du kan også importere specifikke typer direkte:

```typescript
import { Salon, Booking, Customer, BookingStatus, PaymentStatus } from './types/database';

// Nu har du fuld type safety
const booking: Booking = {
  id: '...',
  status: 'confirmed', // TypeScript vil fejle hvis du skriver en ugyldig status
  // ...
};
```

### Med Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';

const supabase = createClient<Database>(url, key);

// Nu har du auto-completion og type checking på alle queries
const { data } = await supabase.from('bookings').select('*').eq('status', 'confirmed');
// data er automatisk typet som Booking[]
```

## Tilgængelige typer

### Tabeller

- `AuditLog` - audit_log
- `Booking` - bookings
- `BookingAccessToken` - booking_access_tokens
- `Customer` - customers
- `CustomerInvitation` - customer_invitations
- `ErrorEvent` - error_events
- `Event` - events
- `Membership` - memberships
- `NotificationOutbox` - notification_outbox
- `Payment` - payments
- `PlatformAdmin` - platform_admins
- `Salon` - salons
- `SalonBusinessHours` - salon_business_hours
- `Service` - services
- `StaffAuth` - staff_auth
- `StaffProfile` - staff_profiles
- `StaffService` - staff_services
- `StaffSession` - staff_sessions
- `StaffTimeOff` - staff_time_off
- `StaffWorkingHours` - staff_working_hours
- `User` - users
- `WorkerHeartbeat` - worker_heartbeats

### Enums

- `BookingStatus` - 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
- `NotificationChannel` - 'email' | 'sms' | 'push'
- `NotificationStatus` - 'pending' | 'sent' | 'failed' | 'processing'
- `PaymentStatus` - 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled'
- `SalonStatus` - 'draft' | 'active'

## Helper types

- `Tables<T>` - Få Row typen for en tabel
- `Enums<T>` - Få værdierne for en enum

## Vedligeholdelse

Kør følgende kommandoer regelmæssigt for at holde typerne synkroniserede:

```bash
# Check forskelle mellem lokal og remote
supabase db diff --linked

# Generer opdaterede typer
supabase gen types --local --schema public > apps/api/src/types/database.ts

# Type check
pnpm typecheck
```
