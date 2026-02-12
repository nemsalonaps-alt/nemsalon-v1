# Mobile App Plan

**Status:** Postponed (not in V1 MVP)

**Decision Date:** 2026-02-05

## Why Mobile is Not in V1

The mobile app has been removed from the repository for V1 because:

1. **MVP Scope Priority:** Web app covers 95% of salon management use cases
2. **Resource Allocation:** Focus on solidifying core booking flow first
3. **Technical Debt:** Empty mobile structure created confusion about project state
4. **Customer Portal:** Public booking works on mobile web - sufficient for V1

## What We Removed

```
apps/mobile/
├── package.json (185 bytes - minimal)
├── src/
│   └── index.tsx (placeholder only)
└── tsconfig.json
```

## Mobile Strategy for V2

### Phase 1: PWA First (Recommended)
- Convert web app to Progressive Web App
- Add service worker for offline support
- Push notifications via web push
- Home screen installation

### Phase 2: React Native (If Needed)
**Prerequisites:**
- Web app has 500+ active monthly salons
- Clear feature gap that PWA cannot solve
- Staff need native mobile features (camera, NFC, etc.)

**Technology Stack (Decision):**
- **Framework:** React Native (not Expo)
- **Navigation:** React Navigation v6+
- **State:** Same as web (React Query / Zustand)
- **UI:** React Native Paper or custom design system
- **Auth:** Supabase Auth (same as web)
- **API:** Shared API client from `packages/sdk`

### Shared Code Strategy

When mobile is reintroduced, these should be shared:

```
packages/shared/
├── types/          # Pure domain types (no runtime deps)
├── constants/      # Cross-cutting constants
├── utils/          # Pure utilities (date, formatting, validation)
└── schemas/        # Zod schemas (shared validation)

packages/ui/
├── primitives/     # Button, Input, Card, etc.
├── theme/          # Colors, typography, spacing
└── tokens/         # Design tokens (CSS variables + RN theme)
```

### Mobile-Specific Structure

```
apps/mobile/
├── src/
│   ├── features/        # Same feature names as web
│   │   ├── auth/
│   │   ├── console/     # Simplified for mobile
│   │   └── public/      # Customer booking
│   ├── components/      # Mobile-specific wrappers
│   ├── navigation/      # React Navigation setup
│   ├── services/        # Native services (push, camera)
│   └── App.tsx
├── package.json
└── ios/
└── android/
```

## Success Criteria for Mobile

Before starting mobile development:
- [ ] Web app has < 0.5% critical bugs per month
- [ ] API response time p95 < 200ms
- [ ] Booking completion rate > 80% on mobile web
- [ ] At least 3 customers explicitly request native app

## Technical Decisions (Locked)

| Decision | Value | Rationale |
|----------|-------|-----------|
| Platform | iOS + Android | Full market coverage |
| Offline | Yes | Staff need calendar offline |
| Sync | Optimistic | Fast UI, background reconcile |
| Bundle | Separate | Mobile can iterate faster |

## Migration Path

When ready to add mobile:

1. Create `apps/mobile` with React Native CLI
2. Set up shared packages first (`shared`, `ui`)
3. Implement auth feature only (login/logout)
4. Add console feature with simplified calendar
5. Public booking last (web PWA may suffice)

## Notes

- Do NOT use Expo - need native module flexibility
- Do NOT share React components directly (RN != web)
- DO share business logic via `packages/shared`
- DO share API client via `packages/sdk`
- DO maintain feature parity with web where applicable

---

**Last Updated:** 2026-02-05  
**Next Review:** When web hits 500 active salons
