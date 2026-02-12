# Staff Console Refactoring Plan

## Overview

Refactoring af StaffConsole fra én lang side med foldet settings panel til et simpelt 5-mode system.

## Grundprincip

Medarbejderen har 3 behov:

1. **Min dag** - hvad sker der lige nu
2. **Min indtjening** - hvad tjener jeg
3. **Min tilgængelighed** - hvornår arbejder jeg

Alt andet er sekundært og skjules under Profile.

---

## New Architecture

### 5 Modes (Top Navigation)

```
[Home] [Schedule] [Bookings] [Earnings] [Profile]
```

### Mode 1: Home ("Min dag") - DEFAULT

**Purpose:** Dagens overblik - hurtigt og simpelt

**Content:**

- **Næste kunde** (prominent, stor)
  - Navn, tid, service
  - [START BEHANDLING] knap
- **Dagens liste** (kronologisk)
  - Tidspunkt
  - Navn + service
  - Status badge (confirmed/ankommet/igang/færdig/no-show)
  - Tydelig farvekodning
- **Quick actions** på valgt booking
  - Start/Igangværende/Afslut

**Not included:**

- Grafer
- Mål
- Chat
- Historik
- Indtjening

### Mode 2: Schedule

**Purpose:** Mine vagter og fri

**Content:**

- **Denne uge** oversigt
- **Mine arbejdstider** (redigerbar)
- **Ferie/fridage** (eksisterende time-off funktion)
- **Status toggle:**
  - 🟢 På arbejde
  - 🟡 Pause
  - 🔴 Offline

**Combines:**

- Eksisterende working hours
- Eksisterende time off
- Check-in/Workmode/Status (slået sammen)

### Mode 3: Bookings

**Purpose:** Detaljeret booking information

**Content:**

- **Booking liste** (kan filtreres/søges)
- **Booking detaljer** ved klik:
  - Kunde: navn, telefon, email
  - Service: navn, tid, pris
  - Noter/allergier
  - Betalingsstatus
  - [Ring til kunden] knap
  - Tidligere besøg

**Actions:**

- Start behandling
- Afslut behandling
- Markér no-show
- Rediger noter

### Mode 4: Earnings

**Purpose:** Indtjenings- og mål-visning

**Content:**

- **Dagens indtjening**
  - Kr. 1.240 i dag
  - 3 behandlinger
- **Månedens indtjening**
  - Kr. 18.500 (maj)
  - vs månedsmål: Kr. 20.000
  - Progress bar: 92.5%
- **Provision breakdown**
  - Hver behandling med provision
  - Tips total
- **Motivation**
  - "Du mangler 1.500 kr for at nå dit mål"

**Note:** Kræver ny backend API for staff earnings/commission tracking.

### Mode 5: Profile

**Purpose:** Personlig info og sekundære funktioner

**Content:**

- **Profil info**
  - Navn, foto, email, telefon
- **Sekundære funktioner**
  - Fotos/portfolio (hvis aktiveret)
  - Anmeldelser (hvis aktiveret)
  - Mål-indstillinger
  - Chat (hvis aktiveret)
- **Settings**
  - Sprog
  - Notifikationer
  - Log ud

---

## UI Changes

### Navigation

- **Desktop:** Top horizontal tabs
- **Mobile:** Bottom navigation (fixed)
- **Active state:** Tydelig visuel markering
- **Max 5 items:** Ingen overflow, ingen dropdowns

### Visual Design

- **Høj kontrast:** Store knapper, tydelige farver
- **Status farver:**
  - 🟢 Grøn: Ankommet/Igangværende
  - 🟡 Gul: Venter/Bekræftet
  - 🔴 Rød: No-show
  - ⚪ Grå: Færdig/Afsluttet
- **Whitespace:** Renset for støj
- **Loading:** Skeleton screens, ikke spinners
- **Error:** Tydelige fejlbeskeder med retry

### Interactions

- **1 klik:** Se booking
- **2 klik:** Start/afslut behandling
- **Swipe:** (mobil) Quick actions på bookings
- **Keyboard:** Tab navigation fungerer

---

## Technical Implementation

### State Management

```typescript
type StaffMode = 'home' | 'schedule' | 'bookings' | 'earnings' | 'profile';

const [currentMode, setCurrentMode] = useState<StaffMode>('home');
```

### Component Structure

```
StaffConsole/
├── StaffConsole.tsx (main container)
├── components/
│   ├── ModeNavigation.tsx
│   ├── HomeMode.tsx
│   ├── ScheduleMode.tsx
│   ├── BookingsMode.tsx
│   ├── EarningsMode.tsx
│   └── ProfileMode.tsx
└── hooks/
    ├── useStaffBookings.ts
    ├── useStaffSchedule.ts
    └── useStaffEarnings.ts (future)
```

### Data Flow

1. StaffConsole loader profil og bookings én gang
2. Hver mode får data via props
3. Mutations (status updates) refresher bookings
4. Ingen global state - local state only

### API Requirements

**Eksisterende (reused):**

- `GET /v1/staff/me` - Profil
- `GET /v1/staff/{id}/working-hours` - Arbejdstider
- `GET /v1/staff/{id}/time-off` - Ferie
- `GET /v1/bookings` - Bookings
- `POST /v1/bookings/{id}/status` - Opdater status

**Ny (for Earnings):**

- `GET /v1/staff/me/earnings` - Indtjening
- `GET /v1/staff/me/earnings/summary` - Dag/måned totaler
- `GET /v1/staff/me/goals` - Mål-indstillinger

---

## Implementation Phases

### Phase 1: Navigation + Home (1 dag)

- [ ] Byg ModeNavigation komponent
- [ ] Refactor StaffConsole til at vise modes
- [ ] Redesign Home mode
- [ ] Test at eksisterende funktionalitet stadig virker

### Phase 2: Schedule Mode (0.5 dag)

- [ ] Udtræk working hours og time off til egen mode
- [ ] Tilføj status toggle (På arbejde/Pause/Offline)
- [ ] Vis uge-oversigt

### Phase 3: Bookings Mode (0.5 dag)

- [ ] Flyt booking detaljer til egen mode
- [ ] Tilføj søg/filtrer
- [ ] Tilføj kunde info visning

### Phase 4: Profile Mode (0.5 dag)

- [ ] Opret Profile mode
- [ ] Flyt sekundære settings herhen
- [ ] Tilføj profil info visning

### Phase 5: Earnings Mode (2-3 dage)

- [ ] Design database schema for earnings
- [ ] Byg backend API
- [ ] Implementér Earnings mode UI
- [ ] Tilføj mål/progress tracking

### Phase 6: Polish (1 dag)

- [ ] Mobile-optimering
- [ ] Loading states
- [ ] Error handling
- [ ] Accessibility
- [ ] Tests

---

## Files to Modify

### Modified

- `apps/web/src/features/staff/StaffConsole.tsx` - Main refactor
- `apps/web/src/features/staff/staff-console.css` - Styling updates

### New Files

- `apps/web/src/features/staff/components/ModeNavigation.tsx`
- `apps/web/src/features/staff/components/HomeMode.tsx`
- `apps/web/src/features/staff/components/ScheduleMode.tsx`
- `apps/web/src/features/staff/components/BookingsMode.tsx`
- `apps/web/src/features/staff/components/EarningsMode.tsx`
- `apps/web/src/features/staff/components/ProfileMode.tsx`
- `apps/web/src/features/staff/hooks/useStaffBookings.ts`
- `apps/web/src/features/staff/hooks/useStaffSchedule.ts`

---

## Success Criteria

1. **Navigation:** Medarbejder kan skifte mellem 5 modes uden forvirring
2. **Home:** Næste kunde vises prominent, dagens liste er overskuelig
3. **Actions:** Start/afslut behandling kræver max 2 klik
4. **Mobile:** Fungerer godt på telefon (touch targets, swipe)
5. **Speed:** Ingen unødvendige loading states
6. **Focus:** Ingen distraktioner (chat, grafer, analytics) på Home

---

## Notes

- **Earnings er fremtidigt:** Bygger UI nu, men viser placeholder indtil backend er klar
- **Chat droppes:** Ikke core funktionalitet, for meget støj
- **Offline:** Senere feature - fokus på online først
- **Swipe actions:** Mobil-optimering, ikke kritisk for MVP
