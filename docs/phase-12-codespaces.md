# Phase 12 — Integration Surface (Codespaces Continuation)

Phase 12 implements the external integration layer for VantageMap:
OpenAPI documentation, GraphQL query API, webhook event system, and
CSV import/export endpoints.

---

## New Dependencies to Install

```bash
# GraphQL (Phase 12.2)
npm install graphql

# CSV parsing (Phase 12.4/12.5)
npm install papaparse
npm install -D @types/papaparse
```

---

## Database Migration

Run the webhook tables migration:

```bash
# Option A: Use drizzle-kit
npx drizzle-kit push

# Option B: Run SQL directly
psql $DATABASE_URL -f drizzle/0001_webhook_tables.sql
```

This creates two new tables:

- `webhooks` — Subscription registry (URL, events, secret, active flag)
- `webhook_deliveries` — Delivery log with retry tracking

---

## New Files Created

| File                                        | Purpose                                      |
| ------------------------------------------- | -------------------------------------------- |
| `src/lib/openapi.ts`                        | OpenAPI 3.1 specification (declarative)      |
| `src/app/api/docs/openapi.json/route.ts`    | Serves the spec as JSON                      |
| `src/app/api/docs/page.tsx`                 | Interactive API explorer (Scalar UI via CDN) |
| `src/lib/graphql-schema.ts`                 | GraphQL schema with all 12 document types  |
| `src/app/api/graphql/route.ts`              | GraphQL POST/GET endpoint                    |
| `src/db/schema/webhooks.ts`                 | Webhook + delivery DB schema                 |
| `src/lib/webhook-engine.ts`                 | Event catalog, HMAC signing, delivery engine |
| `src/app/api/webhooks/route.ts`             | Webhook CRUD (list, create)                  |
| `src/app/api/webhooks/[id]/route.ts`        | Webhook instance (get, update, delete)       |
| `src/app/api/import/route.ts`               | CSV import with preview/execute modes        |
| `src/app/api/export/route.ts`               | CSV export with field selection              |
| `src/lib/feature-flags.ts`                  | +4 flags (GRAPHQL, WEBHOOKS, IMPORT, EXPORT) |
| `drizzle/0001_webhook_tables.sql`           | SQL migration for webhook tables             |
| `src/__tests__/phase12-integration.test.ts` | Unit tests for Phase 12                      |

---

## Feature Flags

Four new feature flags (all default to `true`):

| Flag                   | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `FEATURE_GRAPHQL_API`  | Enable/disable GraphQL endpoint          |
| `FEATURE_WEBHOOKS_API` | Enable/disable webhook CRUD and delivery |
| `FEATURE_IMPORT_API`   | Enable/disable CSV import                |
| `FEATURE_EXPORT_API`   | Enable/disable CSV export                |

To disable any in `.env`:

```env
FEATURE_GRAPHQL_API=false
FEATURE_WEBHOOKS_API=false
```

---

## Testing

```bash
# Run Phase 12 tests
npx vitest run src/__tests__/phase12-integration.test.ts

# Run all tests
npx vitest run
```

---

## Verification Steps

### 12.1 — OpenAPI Documentation

1. Start dev server: `npm run dev`
2. Open http://localhost:3000/api/docs/openapi.json — should return JSON spec
3. Open http://localhost:3000/api/docs — should show interactive Scalar API reference

### 12.2 — GraphQL

```bash
# Introspection query
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "{ __schema { types { name } } }"}'

# Query applications
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "{ applications(page: 1, pageSize: 5) { nodes { id name lifecycle } pageInfo { total hasNextPage } } }"}'

# Query with relationship traversal
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "{ application(id: \"<uuid>\") { name relatedTo { targetType targetId relationshipType } } }"}'
```

### 12.3 — Webhooks

```bash
# Create a webhook
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"url": "https://example.com/hook", "events": ["application.created", "application.updated"], "secret": "my-secret"}'

# List webhooks
curl http://localhost:3000/api/webhooks \
  -H "Authorization: Bearer <token>"

# Get webhook with recent deliveries
curl http://localhost:3000/api/webhooks/<id> \
  -H "Authorization: Bearer <token>"
```

### 12.4 — CSV Import

```bash
# Preview mode (dry run)
curl -X POST http://localhost:3000/api/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@applications.csv" \
  -F "documentType=Application" \
  -F "mode=preview"

# Execute mode (persists data)
curl -X POST http://localhost:3000/api/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@applications.csv" \
  -F "documentType=Application" \
  -F "mode=execute"
```

Sample CSV format:

```csv
name,description,lifecycle,health,owner
"My App","Description here","Active","Good","Team A"
"Another App","","Phase In","Adequate",""
```

### 12.5 — CSV Export

```bash
# Export all applications
curl -o apps.csv http://localhost:3000/api/export?type=Application \
  -H "Authorization: Bearer <token>"

# Export with field selection
curl -o apps.csv "http://localhost:3000/api/export?type=Application&fields=id,name,lifecycle,health" \
  -H "Authorization: Bearer <token>"

# Export with filter
curl -o apps.csv "http://localhost:3000/api/export?type=Application&filter=CRM" \
  -H "Authorization: Bearer <token>"
```

---

## Architecture Notes

### GraphQL Design Decisions

- **Read-only queries** — mutations stay in REST. GraphQL is for flexible field selection and relationship traversal (matching LeanIX pattern).
- **Connection pattern** — paginated results use `{ nodes, pageInfo, totalCount }`.
- **Depth limiting** — max depth 5 to prevent DoS via deeply nested relationship traversal.
- **No DataLoader** — N+1 for relationships is acceptable at MVP scale. Add DataLoader in Phase 15 (Performance).

### Webhook Design Decisions

- **HMAC-SHA256 signing** — subscribers verify authenticity via `X-Webhook-Signature` header.
- **Exponential backoff** — 1min, 5min, 30min retry schedule (3 attempts max).
- **Event catalog** — strongly typed event names with `entity.action` convention.
- **Fire-and-forget** — `dispatchWebhookEvent()` is non-blocking to avoid slowing mutation endpoints.
- **Retry processor** — `processWebhookRetries()` should be called by Inngest cron (Phase 5 integration). For now, manual invocation or a simple cron endpoint.

### Import/Export Design Decisions

- **Preview mode** — always validate before executing to prevent data corruption.
- **Column aliases** — common header variations mapped to DB columns automatically.
- **Upsert logic** — if CSV row has an `id` column matching existing record, updates instead of inserting.
- **Size limits** — 5MB file, 10,000 rows for import; 50,000 rows for export.

---

## Wiring Webhooks to Existing CRUD Routes

To trigger webhook events from existing CRUD operations, add
`dispatchWebhookEvent()` calls to your route handlers. Example:

```typescript
// In src/app/api/applications/route.ts (POST handler)
import { dispatchWebhookEvent } from "@/lib/webhook-engine";

// After successful insert:
await dispatchWebhookEvent(
  "application.created",
  {
    id: created.id,
    name: created.name,
  },
  { userId: session.user.id }
);
```

This is intentionally not wired automatically in Phase 12 to avoid
modifying all existing routes. Wire events incrementally as needed.

---

## Known Limitations (MVP)

1. **No XLSX export** — only CSV. Add `exceljs` package post-MVP for Excel support.
2. **No streaming** — export fetches all rows into memory (up to 50K).
3. **No GraphQL mutations** — all writes go through REST endpoints.
4. **No subscription (WebSocket)** — GraphQL subscriptions deferred to Phase 15.
5. **Webhook retry processor** not auto-scheduled — needs Inngest cron or manual trigger.
6. **Scalar API Reference** loaded from CDN — if offline, swap to local build.
