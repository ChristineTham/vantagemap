# Neon Serverless Postgres Best Practices Review

**Date:** 2026-06-01  
**Scope:** `src/db/`, `src/env.ts`, `drizzle.config.ts`, `.env.example`, connection patterns

## Verdict: PASS — Solid Setup, Minor Improvements Applied

The codebase correctly uses Neon's HTTP driver for serverless/edge compatibility with proper lazy initialization.

## Configuration (All Correct)

| Aspect          | Status | Notes                                         |
| --------------- | ------ | --------------------------------------------- |
| Driver          | ✅     | `neon()` HTTP — correct for Vercel serverless |
| ORM             | ✅     | `drizzle-orm/neon-http` — correct pairing     |
| Lazy init       | ✅     | Proxy pattern avoids build-time errors        |
| Env validation  | ✅     | `@t3-oss/env-nextjs` + Zod                    |
| Schema-as-code  | ✅     | Drizzle schema in `src/db/schema/`            |
| Migrations      | ✅     | `drizzle-orm/neon-http/migrator`              |
| Auth connection | ✅     | Shares single `db` instance (efficient)       |

## Why HTTP Driver Is Correct

The project deploys to Vercel serverless. The HTTP driver (`neon()`) is the optimal choice because:

- **No persistent connections** — each query is a stateless HTTP request
- **No connection pooling needed** — HTTP is inherently stateless
- **Edge-compatible** — works in Vercel Edge Functions
- **No WebSocket config** — no `ws` package, no `neonConfig` needed
- **No connection exhaustion** — no `max_connections` concern

Connection pooling (`-pooler` suffix) is only needed for TCP/WebSocket connections.

## Changes Applied

### 1. Added `fetchOptions` to Neon client

**File:** `src/db/index.ts`

```typescript
neon(url, {
  fetchOptions: { priority: "high", cache: "no-store" },
});
```

- `priority: "high"` — prioritizes DB requests in the browser fetch queue
- `cache: "no-store"` — prevents accidental HTTP response caching of query results

### 2. Added `sslmode=require` enforcement

**File:** `src/env.ts`

```typescript
DATABASE_URL: z
  .string()
  .url()
  .refine(
    (url) => url.includes("sslmode=require") || url.includes("sslmode=verify"),
    "DATABASE_URL must include sslmode=require for secure connections to Neon"
  ),
```

Prevents accidental unencrypted connections. Neon requires SSL.

### 3. Improved `.env.example` with pooler documentation

**File:** `.env.example`

Added comments explaining:

- When to use pooled vs direct connections
- How to add `-pooler` suffix for TCP/WebSocket use
- That HTTP driver doesn't need pooler

### 4. Created retry utility for transient failures

**File:** `src/lib/neon-retry.ts`

Neon recommends retry logic for HTTP queries to handle brief connection drops during maintenance/scaling. The utility:

- Retries up to 3 times with exponential backoff + jitter
- Only retries transient errors (network failures, 502/503, cold start timeouts)
- Non-transient errors (SQL errors, auth failures) throw immediately
- Zero external dependencies

**Usage:**

```typescript
import { withRetry } from "@/lib/neon-retry";

// Wrap critical queries that must survive transient failures
const users = await withRetry(() => db.select().from(usersTable));
```

**When to use:** Wrap important queries in background jobs, webhooks, and import operations. Regular API routes can rely on the client retrying (HTTP is idempotent for reads).

## Recommendations NOT Implemented (No Action Needed)

| Recommendation                    | Why Skipped                                      |
| --------------------------------- | ------------------------------------------------ |
| Connection pooling (`-pooler`)    | Not needed — HTTP driver is stateless            |
| WebSocket driver                  | Not needed — no interactive transactions         |
| `neonConfig.webSocketConstructor` | Not applicable to HTTP driver                    |
| Separate auth DB connection       | Single instance is more efficient                |
| `drizzle-kit` direct connection   | Already correct — HTTP driver doesn't use pooler |

## Package Version Note

Current: `@neondatabase/serverless` v1.1.0. The GA release (v1.0.0+) is stable. Update to latest when running `npm update` in Codespaces — no breaking changes expected within the `^1.x` range.

## Verification

```bash
# Env validation catches missing sslmode
DATABASE_URL="postgresql://user:pass@host/db" npm run dev
# → Error: DATABASE_URL must include sslmode=require

# Correct URL passes
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" npm run dev
# → App starts normally

# Build without DB (CI mode)
SKIP_ENV_VALIDATION=true npm run build
# → Succeeds
```
