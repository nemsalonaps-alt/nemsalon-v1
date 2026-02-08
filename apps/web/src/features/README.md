# Web Features

**Ansvar:** Feature-organiseret React kode til web appen. Hver feature er et isoleret domæne med egne komponenter, hooks, og API integration.

## Struktur

```
features/
├── auth/           # Login, signup, password reset
├── console/        # Admin dashboard (kalender, bookinger, indstillinger)
├── onboarding/     # Ny salon setup flow
├── platform/       # Platform admin (support/ops)
├── public/         # Public booking (kunde flow)
└── staff/          # Staff portal
```

## Konventioner

**Hver feature mappe indeholder:**
- `*.tsx` komponenter (PascalCase)
- `api.ts` - API klient funktioner
- `index.ts` - public exports
- `hooks/` - React hooks specifikke for featuren
- `components/` - delte komponenter inden for featuren

**Import regler:**
```typescript
// ✅ OK: Import fra samme feature
import { BookingFlow } from './BookingFlow'

// ✅ OK: Import fra shared
import { Button } from '@/components/ui/button'

// ✅ OK: Import fra andre features via index
import { useAuth } from '@/features/auth'

// ❌ IKKE OK: Deep import fra andre features
import { something } from '@/features/console/deep/file'
```

## Feature: Public Booking

**Ansvar:** Kunde-facing booking flow.

**Hovedkomponenter:**
- `PublicBookingApp.tsx` - Entry point / router
- `PublicBookingFlow.tsx` - Step-by-step booking wizard
- `BookingFlow.tsx` - Service + staff + time valg
- `PublicBookingConfirmation.tsx` - Bekræftelse efter betaling
- `PublicBookingManage.tsx` - Kunde kan ændre/annullere booking
- `CustomerDashboard.tsx` - Kunde profil + historik

**API:** `api.ts` - Integration med backend public endpoints

**Token system:** `booking-token.ts` - Sikker adgang til booking uden login

## Feature: Console (Admin)

**Ansvar:** Salon ejer/admin dashboard.

**Hovedkomponenter:**
- Kalender visning
- Booking management
- Kunde database
- Indstillinger (services, staff, åbningstider)
- Rapport oversigt

## Feature: Onboarding

**Ansvar:** Ny salon setup - trin-for-trin guide til første konfiguration.

**Flow:**
1. Opret salon
2. Tilføj services
3. Tilføj medarbejdere
4. Sæt åbningstider
5. Aktiver online booking

## Shared Components

Global UI komponenter ligger i `/src/components/ui/` (design system).

## Quick Links

- [Public booking feature](./public/)
- [Console feature](./console/)
- [Design system](../../components/ui/)
