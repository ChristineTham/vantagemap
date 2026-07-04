# ADR-005: Async Job Processing

**Status:** Accepted  
**Date:** 2026-05-12  
**Decision:** Inngest

## Context

VantageMap requires async job processing for:

- Webhook delivery with retries and exponential backoff (Phase 12.3)
- CSV/Excel import processing with progress tracking (Phase 12.4)
- Report generation and aggregation (Phase 13)
- Scheduled jobs for lifecycle checks and quality metrics (Phase 13.4, 13.6)
- Future connector sync jobs (Phase 15.6)

Requirements from [nfr.md](../phase-0/nfr.md):

- Background job success rate: ≥99% with automatic retries
- Webhook dispatch: median <3s from event commit to first delivery attempt
- Dead-letter handling for failed deliveries
- Job observability (status, retries, error logs)

Constraints:

- Zero-cost MVP (no paid Redis or queue infrastructure)
- Open-source or free tier
- Serverless-compatible (Vercel deployment)

## Options Evaluated

### 1. Inngest

| Criterion         | Assessment                                                             |
| ----------------- | ---------------------------------------------------------------------- |
| License           | Open-source (Apache 2.0 for SDK, source-available for server)          |
| Architecture      | Event-driven function orchestration; functions are triggered by events |
| Retry semantics   | Built-in configurable retries with exponential backoff                 |
| Dead-letter       | Built-in failed function tracking and replay                           |
| Job observability | Dashboard with function run history, logs, and metrics                 |
| Scheduling        | Built-in cron scheduling                                               |
| Serverless        | **Native** — designed for serverless; functions run as HTTP handlers   |
| Infrastructure    | Zero additional infrastructure for MVP (Inngest Cloud free tier)       |
| Free tier         | 50K function runs/month, unlimited functions                           |
| Self-hosting      | Open-source server available for production                            |
| AI familiarity    | Moderate — growing adoption in Next.js ecosystem                       |
| Step functions    | Built-in multi-step workflows with automatic state management          |

### 2. BullMQ + Redis

| Criterion         | Assessment                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------- |
| License           | MIT (BullMQ), BSD (Redis)                                                                   |
| Architecture      | Queue-based; workers pull jobs from Redis queues                                            |
| Retry semantics   | Configurable retries, backoff strategies                                                    |
| Dead-letter       | Built-in dead-letter queue                                                                  |
| Job observability | Bull Board UI (community), or custom                                                        |
| Scheduling        | Repeatable jobs with cron syntax                                                            |
| Serverless        | **Poor** — requires persistent Redis and long-running workers                               |
| Infrastructure    | **Requires Redis server** — Upstash Free (10K commands/day) insufficient for job processing |
| Free tier         | Upstash Free is too limited; real Redis hosting needed                                      |
| Self-hosting      | Requires Redis + worker process management                                                  |
| AI familiarity    | High — well-known pattern                                                                   |

**Concerns:**

- BullMQ requires a persistent Redis instance and long-running worker processes
- This is incompatible with Vercel's serverless model (no persistent processes)
- Upstash Free tier (10K commands/day) would be exhausted quickly by queue operations
- Running a separate worker process contradicts the zero-cost, serverless MVP architecture
- Adds operational complexity: Redis server + worker process + monitoring

### 3. Trigger.dev

| Criterion      | Assessment                                                            |
| -------------- | --------------------------------------------------------------------- |
| License        | Apache 2.0                                                            |
| Architecture   | Cloud-based job orchestration; functions deployed as serverless tasks |
| Free tier      | 50K runs/month                                                        |
| Serverless     | Yes — designed for serverless                                         |
| Self-hosting   | Available but complex                                                 |
| Integration    | Good Next.js integration                                              |
| AI familiarity | Lower than Inngest                                                    |

**Concerns:**

- Newer and less established than Inngest
- Self-hosting is more complex
- Smaller community and ecosystem
- Similar capabilities to Inngest with less maturity

### 4. Vercel Cron + Edge Functions

| Criterion         | Assessment                                  |
| ----------------- | ------------------------------------------- |
| License           | Proprietary (Vercel platform)               |
| Architecture      | Cron-triggered serverless functions         |
| Free tier         | 2 cron jobs on Hobby plan                   |
| Retry semantics   | **None built-in** — must implement manually |
| Dead-letter       | **None**                                    |
| Job observability | Basic function logs only                    |
| Event-driven      | **No** — cron only, no event triggers       |

**Disqualified:** Vercel Cron is too limited for async job processing. Only 2 cron jobs on free tier, no event-driven triggers, no retry/dead-letter handling. Vendor-locked to Vercel.

## Decision

**Inngest** is selected for async job processing.

## Rationale

```
              ┌────────────────────────────────────────────────────┐
              │           Decision Matrix (1-5)                    │
              ├──────────────────────┬────────┬───────┬────────────┤
              │                      │Inngest │BullMQ │Trigger.dev │
              ├──────────────────────┼────────┼───────┼────────────┤
              │ Serverless compat    │   5    │   1   │     5      │
              │ Zero infrastructure  │   5    │   1   │     4      │
              │ Retry / dead-letter  │   5    │   5   │     5      │
              │ Observability        │   5    │   3   │     4      │
              │ Cron scheduling      │   5    │   5   │     5      │
              │ Step functions       │   5    │   2   │     4      │
              │ Free tier            │   5    │   2   │     5      │
              │ Self-host path       │   4    │   5   │     3      │
              │ Event-driven model   │   5    │   3   │     4      │
              │ AI familiarity       │   3    │   5   │     2      │
              ├──────────────────────┼────────┼───────┼────────────┤
              │ TOTAL                │  47    │  32   │    41      │
              └──────────────────────┴────────┴───────┴────────────┘
```

### Key factors:

1. **Serverless-native** — Inngest functions are HTTP handlers, perfectly compatible with Vercel's serverless model. No persistent workers needed.
2. **Zero infrastructure for MVP** — Inngest Cloud free tier (50K runs/month) requires no Redis, no worker processes, no queue management.
3. **Built-in step functions** — Multi-step workflows (e.g., import CSV → validate → upsert → report) with automatic state management between steps.
4. **Event-driven model** — Functions are triggered by events, which maps naturally to VantageMap's domain events (document created, relationship changed, etc.).
5. **Production self-hosting** — Inngest server can be self-hosted for production, removing cloud dependency.

### Architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App (Vercel)                  │
│                                                         │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │ API Route    │    │ Inngest Function Handler      │  │
│  │ Handler      │    │ src/app/api/inngest/route.ts  │  │
│  │              │    │                                │  │
│  │ POST /api/   │    │  ┌─────────────────────────┐  │  │
│  │ capabilities ├───►│  │ inngest.send()          │  │  │
│  │              │    │  │ "capability.created"     │  │  │
│  └──────────────┘    │  └────────────┬────────────┘  │  │
│                      │               │               │  │
│                      │  ┌────────────▼────────────┐  │  │
│                      │  │ Functions:              │  │  │
│                      │  │ • webhook-delivery      │  │  │
│                      │  │ • csv-import            │  │  │
│                      │  │ • report-generation     │  │  │
│                      │  │ • lifecycle-check       │  │  │
│                      │  │ • quality-metrics       │  │  │
│                      │  └─────────────────────────┘  │  │
│                      └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Inngest Cloud     │
                    │  (orchestration)   │
                    │  Free: 50K runs/mo │
                    └────────────────────┘
```

### Example function:

```typescript
// src/inngest/functions/webhook-delivery.ts
import { inngest } from "../client";

export const webhookDelivery = inngest.createFunction(
  {
    id: "webhook-delivery",
    retries: 5,
    backoff: { type: "exponential", delay: "1s" },
  },
  { event: "document/updated" },
  async ({ event, step }) => {
    const subscribers = await step.run("get-subscribers", async () => {
      // Fetch webhook subscriptions for this event type
    });

    for (const sub of subscribers) {
      await step.run(`deliver-${sub.id}`, async () => {
        // POST to subscriber's webhook URL
      });
    }
  }
);
```

## Consequences

- Single Inngest route handler at `src/app/api/inngest/route.ts` serves all functions
- Inngest functions live in `src/inngest/functions/` directory
- Events are sent via `inngest.send()` from API route handlers after mutations
- Inngest Cloud free tier handles orchestration; self-host for production if needed
- No Redis infrastructure required for MVP
- Webhook delivery, imports, and scheduled jobs all use the same framework
- If Inngest Cloud free tier is outgrown, self-hosting the Inngest server is the upgrade path
