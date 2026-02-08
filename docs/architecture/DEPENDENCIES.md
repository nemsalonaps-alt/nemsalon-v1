# Module Dependency Map

**Genereret:** 2026-02-04 via `scripts/analyze-deps.js`

## Arkitektur Status

- ✅ **0 layer violations** - Domain er ren
- ⚠️ **27 cross-module couplings** - Acceptabelt for modular monolith
- 📊 **24 unikke module-forbindelser**

## Godkendte Cross-Module Dependencies

Disse er bevidste design-valg, ikke fejl:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   public    │──────│   content   │◄─────│   payments  │
│  (booking)  │      │   (hub)     │      │  (stripe)   │
└──────┬──────┘      └──────┬──────┘      └─────────────┘
       │                    │
       └────────────────────┘
              availability
```

| From → To | Type | Begrundelse |
|-----------|------|-------------|
| `public → content` | service→repo | Public API læser salon/service/staff direkte |
| `availability → content` | service→repo | Availability beregner fra business hours |
| `payments → content` | service→repo | Opdaterer booking status efter betaling |
| `content → payments` | service→repo | Læser payment status til visning |
| `content → notifications` | service→service | Sender notifikationer ved booking ændringer |
| `payments → events` | service→repo | Logger payment events |
| `public → payments` | service→service | Opretter checkout session |

## Hub Module: Content

`content` modulet er et naturligt hub - det indeholder:
- Salon, Service, Staff, Customer domæner
- Booking data (selvom `booking` modulet håndterer flow)

**Konsekvens:** 5 moduler importerer fra `content`. Dette er OK for v1.

## Anti-patterns at undgå

| Mønster | Status | Løsning |
|---------|--------|---------|
| Domain → Repo | ❌ Ikke fundet | Godt! |
| Domain → API | ❌ Ikke fundet | Godt! |
| API → Repo (samme modul) | ⚠️ Findes | Acceptabelt, men gå via service |
| Service → Repo (cross-module) | ✅ Godkendt | Dokumenteret ovenfor |

## Vedligeholdelse

Kør `node scripts/analyze-deps.js` ved:
- Pre-commit (hvis warnings stiger)
- Før/efter større refaktorering
- Månedlig arkitektur-review

## Fremtidige forbedringer (v2)

1. **Shared Types Module:** Træk domain types ud til `modules/shared/types/`
2. **Read Models:** Separat query-optimeret læser for public/availability
3. **Event-driven:** Brug events modulet til at reducere direkte service kald
