# Platform Admin Elite — System Documentation

## Executive Summary

This document outlines the architecture, features, and implementation roadmap for the **Platform Admin Elite** — an enterprise-grade administrative interface for the NemSalon platform.

**Current State:** Basic platform console with salon listing, audit logs, and impersonation  
**Target State:** Mission Control Center with real-time monitoring, global search, incident management, and revenue analytics

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current Platform Console](#current-platform-console)
3. [Elite Platform Admin Features](#elite-platform-admin-features)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Database Schema Extensions](#database-schema-extensions)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Security & RBAC](#security--rbac)
9. [Monitoring & Alerting](#monitoring--alerting)

---

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM ADMIN ELITE                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Mission │ │  Global  │ │  Salon   │ │ Incident │       │
│  │ Control  │ │  Search  │ │ Command  │ │  Center  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  System  │ │ Revenue  │ │ Support  │ │ Security │       │
│  │   Ops    │ │ Control  │ │   Tools  │ │  Center  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM API MODULE                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Health  │ │  Search  │ │  Salon   │ │ Incident │       │
│  │  Service │ │  Service │ │  Service │ │  Service │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Queue   │ │ Revenue  │ │ Support  │ │  Audit   │       │
│  │  Service │ │  Service │ │  Service │ │  Service │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                          │
│  salons │ bookings │ payments │ users │ audit_log │ metrics │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend:** React + TypeScript, @nemsalon/ui components
- **Backend:** Fastify + TypeScript
- **Database:** PostgreSQL (Supabase)
- **Real-time:** WebSockets / Server-Sent Events
- **Caching:** Redis (for health metrics)
- **Queue:** BullMQ / pg-boss (for background jobs)

---

## Current Platform Console

### Existing Features

Located in `/apps/web/src/features/platform/PlatformConsole.tsx`:

1. **Salon Management**
   - List salons with filters (status, search query)
   - View salon details (ID, status, locale, timezone, currency)
   - Pagination support

2. **Payment Monitoring**
   - List payments per salon
   - Filter by status
   - View payment amount, provider, booking ID

3. **Audit Logging**
   - View recent audit entries
   - Action, entity type, timestamp

4. **User Impersonation**
   - Switch to owner, staff, or customer role
   - Remember last impersonated user
   - Safe banner with exit button

### Current API Endpoints

Located in `/apps/api/src/modules/platform/api/routes.ts`:

```typescript
GET /v1/platform/salons          // List salons with filters
GET /v1/platform/salons/:id      // Get salon details
GET /v1/platform/salons/:id/bookings   // List salon bookings
GET /v1/platform/salons/:id/payments   // List salon payments
GET /v1/platform/audit           // List audit logs
GET /v1/platform/users           // List users
GET /v1/platform/users/:id       // Get user details
```

---

## Elite Platform Admin Features

### 1. Mission Control (Real-time Overview)

**Purpose:** Live control room for platform health monitoring

#### Global Health Strip (Top Bar)

Auto-refreshing every 5 seconds:

| Metric         | Description            | Threshold              |
| -------------- | ---------------------- | ---------------------- |
| API Latency    | P95 response time      | >500ms = warning       |
| DB Health      | Connection pool status | <5 available = warning |
| Webhook Delay  | Processing queue depth | >100 = warning         |
| Queue Backlog  | Pending jobs count     | >1000 = warning        |
| Error Rate     | 5-minute rolling       | >1% = warning          |
| SMS Delivery   | Success rate           | <95% = warning         |
| Email Delivery | Success rate           | <95% = warning         |
| Stripe Health  | Auth & webhook status  | down = critical        |

**UI:** Color-coded badges (🟢/🟡/🔴) with click-to-drilldown

#### Business Health (Center)

```
┌─────────────────────────────────────────────────────────────┐
│  ACTIVE SALONS      GMV (24h)        MRR         CHURN      │
│  ┌─────────────┐   ┌─────────────┐  ┌─────────┐ ┌────────┐  │
│  │    1,247    │   │  DKK 89,420 │  │DKK 42k  │ │  2.3%  │  │
│  │    ↑ 12%    │   │   ↑ 8%      │  │  ↑ 5%   │ │ ↓ 0.5% │  │
│  └─────────────┘   └─────────────┘  └─────────┘ └────────┘  │
│                                                              │
│  Failed Payments: 3.2%    Refund Rate: 1.1%                 │
│  Expansion Revenue: DKK 5,230 (+12%)                        │
└─────────────────────────────────────────────────────────────┘
```

#### Risk Radar (Bottom)

Salons flagged by risk algorithms:

- **At Risk:** 0 bookings in 30 days
- **Payment Issues:** Failed payments >10%
- **High Cancel Rate:** >20% cancellations
- **Error Spikes:** >50 errors in 1 hour
- **Declining Usage:** -30% booking volume WoW

### 2. Global Search Engine

**Purpose:** Universal search across all platform entities

#### Search Types

```typescript
type SearchResult =
  | { type: 'salon'; id: string; name: string; status: string }
  | { type: 'booking'; id: string; salonName: string; customerName: string; status: string }
  | { type: 'payment'; id: string; salonName: string; amount: number; status: string }
  | { type: 'customer'; id: string; salonName: string; email: string; phone: string }
  | { type: 'staff'; id: string; salonName: string; name: string; role: string }
  | { type: 'user'; id: string; email: string; role: string };
```

#### Search Interface

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Search...                                    [Filters ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Recent Searches:                                           │
│  • Salon: "Hår & Snyd"                                      │
│  • Booking: "BK-2024-001234"                                │
│  • Customer: "john@example.com"                             │
│                                                              │
│  Results (sorted by relevance):                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🏢 Salon: Hår & Snyd                                 │   │
│  │    ID: sln_abc123 | Status: Active | Locale: da-DK  │   │
│  │    [View] [Impersonate Owner] [View Bookings]       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📅 Booking: BK-2024-001234                           │   │
│  │    Salon: Hår & Snyd | Customer: John Doe           │   │
│  │    Status: Confirmed | Amount: DKK 450              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3. Salon Command Center

**Purpose:** Mini admin universe per salon with full drill-down

#### Salon Overview Card

```
┌─────────────────────────────────────────────────────────────┐
│  Hår & Snyd                                    [Impersonate] │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  Status: 🟢 Active        Plan: Professional                 │
│  Owner: Jane Doe          Stripe: ✅ Connected               │
│  Staff: 4                 Webhook: 2 min ago                 │
│  Locale: da-DK            Timezone: Europe/Copenhagen        │
│                                                              │
│  Revenue (30d): DKK 12,450    Risk Score: 🟢 Low (23/100)   │
└─────────────────────────────────────────────────────────────┘
```

#### Tabs

1. **Overview**
   - Key metrics (bookings, revenue, customers)
   - Risk indicators
   - Activity feed (last 50 events)

2. **Bookings**
   - Full filterable table
   - Quick actions:
     - Retry failed payment
     - Force confirm
     - Cancel with reason
     - Reschedule

3. **Payments**
   - Intent status
   - Webhook history
   - Refund button
   - Retry button

4. **Notifications**
   - Sent log
   - Delivery status
   - Retry button
   - Raw payload viewer

5. **Errors**
   - All errors scoped to salon
   - Trace ID
   - Stack snapshot
   - Related bookings/payments

6. **Audit**
   - Who did what
   - Impersonation logs
   - Feature flag changes

### 4. Incident Center

**Purpose:** Enterprise-grade incident management

```
┌─────────────────────────────────────────────────────────────┐
│  Active Incidents                           [+ New Incident] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔴 #INC-2024-001: Payment processing degraded              │
│     Status: Investigating | Started: 2 hours ago            │
│     Affected: 12 salons | Severity: High                    │
│     [Update] [Resolve] [View Timeline]                      │
│                                                              │
│  🟡 #INC-2024-002: SMS delivery delays                      │
│     Status: Monitoring | Started: 30 min ago                │
│     Affected: 3 salons | Severity: Medium                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Incident Fields

```typescript
interface Incident {
  id: string;
  title: string;
  status: 'open' | 'investigating' | 'monitoring' | 'resolved';
  severity: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  resolvedAt?: string;
  affectedSalonIds: string[];
  rootCause?: string;
  timeline: IncidentEvent[];
  linkedErrorCodes: string[];
}
```

### 5. System Operations

#### Jobs Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Background Jobs                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Queue: notification-outbox                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  Pending: 234    Processing: 12    Completed: 45,234        │
│  Failed: 3       Dead Letter: 0                               │
│  [Pause] [Retry Failed] [Clear Dead Letter]                 │
│                                                              │
│  Worker Health: 🟢 3/3 workers active                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Feature Flags

```
┌─────────────────────────────────────────────────────────────┐
│  Feature Flags                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  new-booking-flow                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  Status: 🟢 Enabled for 25% of salons                       │
│  Rollout: Percentage (25%)                                  │
│  Targeted: None                                             │
│  [Edit] [View Audit]                                        │
│                                                              │
│  sms-reminders                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  Status: 🟢 Enabled for 100% of salons                      │
│  Rollout: Global                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6. Revenue Control

#### Subscriptions

```
┌─────────────────────────────────────────────────────────────┐
│  Subscription Plans                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Starter              Professional           Enterprise     │
│  ━━━━━━━━━━━━━━━━━    ━━━━━━━━━━━━━━━━━    ━━━━━━━━━━━━━━   │
│  DKK 0/mo            DKK 299/mo            DKK 799/mo       │
│  1 staff             5 staff               Unlimited        │
│  50 bookings/mo      Unlimited             Unlimited        │
│  [Edit] [Archive]    [Edit] [Archive]      [Edit] [Archive] │
│                                                              │
│  Active Subscriptions: 1,247                                │
│  MRR: DKK 42,350                                            │
│  Churn (30d): 2.3%                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Dunning Center

```
┌─────────────────────────────────────────────────────────────┐
│  Failed Subscription Payments                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔄 Auto-retry Cycle 1/3: 23 payments                       │
│  🔄 Auto-retry Cycle 2/3: 12 payments                       │
│  🔄 Auto-retry Cycle 3/3: 8 payments                        │
│  ❌ Failed permanently: 3 payments (manual outreach needed) │
│                                                              │
│  [Send Reminder Emails] [Contact Support]                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7. Support Superpowers

#### Quick Action Panel

```
┌─────────────────────────────────────────────────────────────┐
│  One-Click Support Tools                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  For Salon: Hår & Snyd                                      │
│                                                              │
│  User Actions:                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Reset        │ │ Regenerate   │ │ Unlock       │        │
│  │ Password     │ │ Stripe Link  │ │ Account      │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                              │
│  Booking Actions:                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Clear Stuck  │ │ Resend       │ │ Requeue      │        │
│  │ Booking      │ │ Webhook      │ │ Notification │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                              │
│  Last Activity:                                             │
│  • API Error: 2 min ago                                     │
│  • Failed SMS: 15 min ago                                   │
│  • Last booking: 3 hours ago                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8. Security Center

```
┌─────────────────────────────────────────────────────────────┐
│  Security Overview                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Admin Access Log (Last 24h)                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  2024-01-15 14:32:05  admin@nemsalon.com  LOGIN_SUCCESS     │
│  2024-01-15 14:35:12  admin@nemsalon.com  IMPERSONATE_START │
│  2024-01-15 14:42:33  admin@nemsalon.com  IMPERSONATE_END   │
│                                                              │
│  IP Anomalies: 0 suspicious activities                      │
│  Rate Limit Violations: 2 (auto-blocked)                    │
│  Token Invalidations: 0                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9. Data & Export Center

```
┌─────────────────────────────────────────────────────────────┐
│  GDPR Data Export                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Export Type:                                               │
│  ○ Full salon data (bookings, customers, payments)          │
│  ○ Customer data only                                       │
│  ○ Audit logs                                               │
│                                                              │
│  Salon: [Dropdown: Hår & Snyd ▼]                            │
│                                                              │
│  Format: JSON / CSV / Excel                                 │
│                                                              │
│  [Generate Export]                                          │
│                                                              │
│  Recent Exports:                                            │
│  • 2024-01-15: Hår & Snyd (2.3 MB) - Ready for download     │
│  • 2024-01-14: Skønhedsbar (1.1 MB) - Expired               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Refactor existing platform console + Mission Control MVP

#### Tasks:

1. **Database Schema**
   - Create `platform_metrics` table
   - Create `platform_health_checks` table
   - Create `feature_flags` table
   - Add indexes for performance

2. **Backend API**
   - `/v1/platform/health` - Real-time health metrics
   - `/v1/platform/metrics` - Business metrics aggregation
   - `/v1/platform/search` - Universal search endpoint
   - WebSocket endpoint for live updates

3. **Frontend**
   - Refactor PlatformConsole to tabbed interface
   - Create MissionControl component
   - Implement health strip with auto-refresh
   - Add business metrics cards

### Phase 2: Global Search + Salon Command Center (Week 3-4)

**Goal:** Universal search and detailed salon drill-down

#### Tasks:

1. **Search Service**
   - Full-text search across all entities
   - Fuzzy matching for names/emails
   - Search result ranking

2. **Salon Command Center**
   - Salon detail view with tabs
   - Bookings table with filters
   - Payments table with actions
   - Notifications log
   - Error viewer

3. **Frontend Components**
   - GlobalSearchBar
   - SearchResultsList
   - SalonCommandCenter
   - BookingActionMenu

### Phase 3: Incident Center + System Ops (Week 5-6)

**Goal:** Enterprise incident management and system operations

#### Tasks:

1. **Incident Management**
   - Create `incidents` table
   - Incident CRUD API
   - Timeline tracking
   - Affected salon linking

2. **System Operations**
   - Jobs dashboard (queue status)
   - Feature flag management
   - Rate limit monitoring
   - Worker health checks

3. **Frontend**
   - IncidentCenter component
   - IncidentTimeline
   - JobsDashboard
   - FeatureFlagManager

### Phase 4: Revenue + Support Tools (Week 7-8)

**Goal:** Revenue analytics and support superpowers

#### Tasks:

1. **Revenue Control**
   - Subscription plan management
   - Dunning logic
   - Revenue analytics (cohorts, LTV, ARPU)
   - MRR tracking

2. **Support Tools**
   - One-click actions API
   - Support action logging
   - Quick action panel UI
   - Activity heatmap

### Phase 5: Security + Data (Week 9-10)

**Goal:** Security center and data export capabilities

#### Tasks:

1. **Security**
   - Enhanced audit logging
   - IP anomaly detection
   - Rate limit dashboard
   - Token invalidation tracking

2. **Data Export**
   - GDPR export generation
   - Backup status monitoring
   - Export history

---

## Database Schema Extensions

### New Tables

```sql
-- Platform health metrics (time-series)
create table platform_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null,
  metric_value numeric not null,
  unit text,
  labels jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_platform_metrics_name_time
  on platform_metrics(metric_name, created_at desc);

-- Health check results
create table platform_health_checks (
  id uuid primary key default gen_random_uuid(),
  check_name text not null,
  status text not null check (status in ('healthy', 'warning', 'critical')),
  message text,
  response_time_ms integer,
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_health_checks_name_time
  on platform_health_checks(check_name, created_at desc);

-- Feature flags
create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  enabled boolean not null default false,
  rollout_type text not null check (rollout_type in ('global', 'percentage', 'targeted')),
  rollout_percentage integer check (rollout_percentage between 0 and 100),
  targeted_salon_ids uuid[],
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Incidents
create table incidents (
  id uuid primary key default gen_random_uuid(),
  incident_number text unique not null,
  title text not null,
  description text,
  status text not null check (status in ('open', 'investigating', 'monitoring', 'resolved')),
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  root_cause text,
  resolution text,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_by uuid references users(id),
  resolved_by uuid references users(id)
);

create table incident_affected_salons (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  salon_id uuid not null references salons(id) on delete cascade,
  impact_description text,
  unique(incident_id, salon_id)
);

create table incident_timeline (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  event_type text not null,
  message text not null,
  metadata jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- Job queue monitoring
create table job_queue_stats (
  id uuid primary key default gen_random_uuid(),
  queue_name text not null,
  pending_count integer not null default 0,
  processing_count integer not null default 0,
  completed_count integer not null default 0,
  failed_count integer not null default 0,
  dead_letter_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Support actions audit
create table support_actions (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  salon_id uuid references salons(id),
  target_user_id uuid references users(id),
  target_booking_id uuid references bookings(id),
  performed_by uuid not null references users(id),
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Data exports
create table data_exports (
  id uuid primary key default gen_random_uuid(),
  export_type text not null,
  salon_id uuid references salons(id),
  requested_by uuid not null references users(id),
  status text not null check (status in ('pending', 'processing', 'ready', 'expired')),
  file_url text,
  file_size_bytes integer,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_data_exports_status on data_exports(status);
create index idx_data_exports_salon on data_exports(salon_id);
```

---

## API Endpoints

### Health & Metrics

```typescript
// Real-time health status
GET /v1/platform/health
Response: {
  checks: HealthCheck[];
  overall: 'healthy' | 'warning' | 'critical';
  timestamp: string;
}

// Business metrics
GET /v1/platform/metrics
Query: { period: '24h' | '7d' | '30d' }
Response: {
  salons: { active: number; total: number };
  gmv: { amount: number; currency: string };
  mrr: number;
  churnRate: number;
  failedPayments: number;
  refundRate: number;
}

// Risk radar
GET /v1/platform/risk-radar
Response: {
  atRisk: RiskSalon[];
  paymentIssues: RiskSalon[];
  highCancelRate: RiskSalon[];
  errorSpikes: RiskSalon[];
  decliningUsage: RiskSalon[];
}
```

### Search

```typescript
// Universal search
GET /v1/platform/search
Query: { q: string; limit?: number; types?: string[] }
Response: {
  results: SearchResult[];
  total: number;
}
```

### Incidents

```typescript
// List incidents
GET /v1/platform/incidents
Query: { status?: string; severity?: string; limit?: number }

// Create incident
POST /v1/platform/incidents
Body: CreateIncidentInput

// Update incident
PATCH /v1/platform/incidents/:id
Body: UpdateIncidentInput

// Add timeline event
POST /v1/platform/incidents/:id/timeline
Body: { eventType: string; message: string }
```

### System Operations

```typescript
// Queue status
GET /v1/platform/queues
Response: { queues: QueueStatus[] }

// Feature flags
GET /v1/platform/feature-flags
GET /v1/platform/feature-flags/:key
POST /v1/platform/feature-flags
PATCH /v1/platform/feature-flags/:key

// Rate limits
GET /v1/platform/rate-limits
Response: { endpoints: RateLimitStatus[] }
```

### Revenue

```typescript
// Subscription plans
GET /v1/platform/subscription-plans
POST /v1/platform/subscription-plans
PATCH /v1/platform/subscription-plans/:id

// Dunning status
GET /v1/platform/dunning
Response: {
  byCycle: { cycle: number; count: number }[];
  failedPermanently: number;
}

// Revenue analytics
GET /v1/platform/revenue/analytics
Query: { period: string }
Response: {
  cohorts: CohortData[];
  ltv: number;
  arpu: number;
}
```

### Support

```typescript
// Quick actions
POST / v1 / platform / support / reset - password;
POST / v1 / platform / support / regenerate - stripe - link;
POST / v1 / platform / support / clear - stuck - booking;
POST / v1 / platform / support / resend - webhook;
POST / v1 / platform / support / requeue - notification;
POST / v1 / platform / support / unlock - account;
```

### Data Export

```typescript
// Request export
POST /v1/platform/exports
Body: { type: string; salonId: string; format: string }

// List exports
GET /v1/platform/exports

// Download export
GET /v1/platform/exports/:id/download
```

---

## Frontend Components

### Component Hierarchy

```
PlatformAdminElite
├── MissionControl
│   ├── HealthStrip
│   ├── BusinessMetricsGrid
│   └── RiskRadar
├── GlobalSearch
│   ├── SearchBar
│   ├── SearchFilters
│   └── SearchResults
├── SalonCommandCenter
│   ├── SalonOverviewCard
│   ├── TabNavigation
│   │   ├── OverviewTab
│   │   ├── BookingsTab
│   │   ├── PaymentsTab
│   │   ├── NotificationsTab
│   │   ├── ErrorsTab
│   │   └── AuditTab
│   └── ActionMenu
├── IncidentCenter
│   ├── IncidentList
│   ├── IncidentDetail
│   └── IncidentTimeline
├── SystemOperations
│   ├── JobsDashboard
│   ├── FeatureFlagManager
│   └── RateLimitMonitor
├── RevenueControl
│   ├── SubscriptionPlans
│   ├── DunningCenter
│   └── RevenueAnalytics
├── SupportTools
│   ├── QuickActionPanel
│   └── ActivityHeatmap
├── SecurityCenter
│   ├── AccessLog
│   └── AnomalyDetector
└── DataExport
    ├── ExportForm
    └── ExportHistory
```

### Key Component Interfaces

```typescript
// Mission Control
interface HealthStripProps {
  checks: HealthCheck[];
  onDrillDown: (check: HealthCheck) => void;
}

interface BusinessMetricsProps {
  metrics: BusinessMetrics;
  period: '24h' | '7d' | '30d';
  onPeriodChange: (period: string) => void;
}

// Global Search
interface GlobalSearchProps {
  onResultSelect: (result: SearchResult) => void;
  recentSearches: string[];
}

// Salon Command Center
interface SalonCommandCenterProps {
  salonId: string;
  initialTab?: string;
}

// Incident Center
interface IncidentCenterProps {
  incidents: Incident[];
  onCreateIncident: () => void;
  onUpdateIncident: (id: string, updates: Partial<Incident>) => void;
}
```

---

## Security & RBAC

### Platform Admin Permissions

```typescript
enum PlatformPermission {
  // Read-only
  VIEW_METRICS = 'platform:metrics:read',
  VIEW_SALONS = 'platform:salons:read',
  VIEW_AUDIT = 'platform:audit:read',

  // Salon management
  MANAGE_SALONS = 'platform:salons:manage',
  IMPERSONATE_USERS = 'platform:impersonate',

  // System operations
  MANAGE_FEATURE_FLAGS = 'platform:flags:manage',
  MANAGE_QUEUES = 'platform:queues:manage',
  VIEW_SYSTEM_HEALTH = 'platform:health:read',

  // Incidents
  CREATE_INCIDENTS = 'platform:incidents:create',
  UPDATE_INCIDENTS = 'platform:incidents:update',

  // Revenue
  VIEW_REVENUE = 'platform:revenue:read',
  MANAGE_PLANS = 'platform:plans:manage',

  // Support
  EXECUTE_SUPPORT_ACTIONS = 'platform:support:execute',

  // Security
  VIEW_SECURITY_LOGS = 'platform:security:read',

  // Data
  EXPORT_DATA = 'platform:export:execute',
}
```

### Security Best Practices

1. **Audit Everything**
   - All platform admin actions logged to audit_log
   - IP address and user agent captured
   - Retention: 2 years

2. **Rate Limiting**
   - Platform admin endpoints: 100 req/min
   - Search endpoints: 30 req/min
   - Support actions: 10 req/min

3. **Session Management**
   - Short-lived tokens (1 hour)
   - Require re-auth for sensitive actions
   - Concurrent session limit: 3

4. **Data Access**
   - Never expose raw database IDs to frontend
   - Use hashed/encoded identifiers
   - Field-level access control for PII

---

## Monitoring & Alerting

### Metrics to Track

**System Health:**

- API response times (p50, p95, p99)
- Database connection pool utilization
- Queue depth and processing rate
- Error rate by endpoint
- Webhook delivery success rate

**Business Health:**

- Active salons (daily/weekly/monthly)
- GMV trends
- MRR and churn rate
- Failed payment rate
- Customer support ticket volume

**Platform Admin Usage:**

- Login frequency
- Feature usage (search, impersonation, etc.)
- Support actions taken
- Data exports requested

### Alerting Rules

```yaml
alerts:
  - name: HighErrorRate
    condition: error_rate > 1%
    duration: 5m
    severity: warning

  - name: CriticalErrorRate
    condition: error_rate > 5%
    duration: 2m
    severity: critical

  - name: DatabaseConnectionsLow
    condition: db_available_connections < 5
    severity: warning

  - name: QueueBacklog
    condition: queue_depth > 1000
    duration: 10m
    severity: warning

  - name: PaymentFailureSpike
    condition: payment_failure_rate > 10%
    duration: 15m
    severity: high
```

---

## Success Metrics

### Phase Completion Criteria

**Phase 1:**

- [ ] Mission Control shows real-time metrics
- [ ] Health strip auto-refreshes every 5s
- [ ] Business metrics load in <2s
- [ ] Risk radar identifies at-risk salons

**Phase 2:**

- [ ] Search returns results in <500ms
- [ ] Salon drill-down shows all tabs
- [ ] Booking actions work end-to-end
- [ ] 100% test coverage for new components

**Phase 3:**

- [ ] Incidents can be created and tracked
- [ ] Timeline shows all events
- [ ] Feature flags can be toggled
- [ ] Queue status updates in real-time

**Phase 4:**

- [ ] Revenue analytics show cohorts
- [ ] Dunning center identifies failed payments
- [ ] Support actions execute in <3s
- [ ] Activity heatmap is accurate

**Phase 5:**

- [ ] GDPR export generates in <5min
- [ ] Security logs are comprehensive
- [ ] All features have audit trails
- [ ] Documentation is complete

---

## Appendix

### File Structure

```
/apps/web/src/features/platform/
├── components/
│   ├── MissionControl/
│   │   ├── HealthStrip.tsx
│   │   ├── BusinessMetricsGrid.tsx
│   │   └── RiskRadar.tsx
│   ├── GlobalSearch/
│   │   ├── SearchBar.tsx
│   │   └── SearchResults.tsx
│   ├── SalonCommandCenter/
│   │   ├── SalonOverviewCard.tsx
│   │   ├── tabs/
│   │   │   ├── OverviewTab.tsx
│   │   │   ├── BookingsTab.tsx
│   │   │   ├── PaymentsTab.tsx
│   │   │   ├── NotificationsTab.tsx
│   │   │   ├── ErrorsTab.tsx
│   │   │   └── AuditTab.tsx
│   │   └── BookingActionMenu.tsx
│   ├── IncidentCenter/
│   │   ├── IncidentList.tsx
│   │   ├── IncidentDetail.tsx
│   │   └── IncidentTimeline.tsx
│   ├── SystemOperations/
│   │   ├── JobsDashboard.tsx
│   │   ├── FeatureFlagManager.tsx
│   │   └── RateLimitMonitor.tsx
│   ├── RevenueControl/
│   │   ├── SubscriptionPlans.tsx
│   │   ├── DunningCenter.tsx
│   │   └── RevenueAnalytics.tsx
│   ├── SupportTools/
│   │   ├── QuickActionPanel.tsx
│   │   └── ActivityHeatmap.tsx
│   ├── SecurityCenter/
│   │   ├── AccessLog.tsx
│   │   └── AnomalyDetector.tsx
│   └── DataExport/
│       ├── ExportForm.tsx
│       └── ExportHistory.tsx
├── hooks/
│   ├── usePlatformHealth.ts
│   ├── useGlobalSearch.ts
│   ├── useSalonDetails.ts
│   ├── useIncidents.ts
│   └── useMetrics.ts
├── api/
│   └── platform-api.ts
├── types/
│   └── platform-types.ts
├── PlatformAdminElite.tsx
└── platform-admin.css

/apps/api/src/modules/platform/
├── api/
│   └── routes.ts
├── services/
│   ├── health-service.ts
│   ├── metrics-service.ts
│   ├── search-service.ts
│   ├── incident-service.ts
│   ├── queue-service.ts
│   ├── revenue-service.ts
│   └── support-service.ts
├── repo/
│   ├── platform-repo.ts
│   ├── metrics-repo.ts
│   ├── incident-repo.ts
│   └── search-repo.ts
└── types/
    └── platform-types.ts
```

### Dependencies

```json
{
  "dependencies": {
    "@nemsalon/ui": "workspace:*",
    "recharts": "^2.10.0",
    "fuse.js": "^7.0.0",
    "date-fns": "^3.0.0",
    "react-window": "^1.8.10"
  }
}
```

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Author:** AI Assistant  
**Status:** Ready for Implementation
