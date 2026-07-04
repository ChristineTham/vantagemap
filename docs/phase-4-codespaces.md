# Phase 4 — Backend API Foundation: Codespaces Completion Guide

Phase 4 utility modules have been created locally. Since package installation and testing cannot run on the local Windows environment, complete the following steps in GitHub Codespaces.

## Files Created

| File                          | Step | Description                                                                           |
| ----------------------------- | ---- | ------------------------------------------------------------------------------------- |
| `src/lib/api-response.ts`     | 4.1  | Standard JSON response envelope, error helpers, Zod validation, route handler wrapper |
| `src/lib/auth.ts`             | 4.2  | Authentication middleware — session cookie, bearer token, dev-mode bypass             |
| `src/lib/rbac.ts`             | 4.3  | RBAC permission checks — role matrix mapping operations to Viewer/Member/Admin        |
| `src/lib/audit.ts`            | 4.4  | Audit logging — `writeAuditLog()`, `writeFailedAuthLog()`, diff computation           |
| `src/lib/audit-types.ts`      | 4.4  | Shared type aliases (DocumentType, AuditAction) to avoid circular imports            |
| `src/lib/query.ts`            | 4.5  | Pagination, sorting, filtering utilities with Drizzle query builders                  |
| `src/lib/feature-flags.ts`    | 4.6  | Environment-variable-backed feature flag system                                       |
| `src/app/api/health/route.ts` | —    | Health check endpoint (`GET /api/health`)                                             |

## Steps to Complete

### 1. Install Dependencies

```bash
npm install
```

No new packages are needed — Phase 4 uses only existing dependencies (`zod`, `drizzle-orm`, `next`).

### 2. Type Check

```bash
npm run type-check
```

All new files under `src/lib/` should compile without errors. Fix any issues related to Drizzle ORM API differences between versions.

### 3. Lint and Format

```bash
npm run lint
npm run format
```

### 4. Test the Health Check Endpoint

```bash
npm run dev
```

Then in another terminal:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-12T...",
  "version": "0.1.0"
}
```

### 5. Test Dev-Mode Authentication

With the dev server running and seeded database:

```bash
# Get the admin user ID from db:studio or the seed output, then:
curl -H "x-dev-user-id: <ADMIN_USER_UUID>" http://localhost:3000/api/health
```

This header is only accepted when `NODE_ENV=development`.

### 6. Build Verification

```bash
SKIP_ENV_VALIDATION=true npm run build
```

Ensure the Next.js build succeeds with the new API infrastructure files.

### 7. (Optional) Add Unit Tests

Consider adding tests in `src/__tests__/` for:

- `api-response.ts` — verify envelope shapes and status codes
- `rbac.ts` — verify permission matrix for each role × operation
- `query.ts` — verify pagination/filter/sort parsing
- `feature-flags.ts` — verify env var resolution and defaults
- `audit.ts` — verify `computeDiff()` output

## API Module Usage Guide

### Response Helpers

```ts
import { ok, created, list, noContent, badRequest, notFound } from "@/lib/api-response";
import { withErrorHandler, parseBody } from "@/lib/api-response";

// Single item
return ok(item);
return created(newItem);

// Paginated list
return list(items, { page: 1, pageSize: 25, total: 100, totalPages: 4 });

// Errors
return badRequest("Name is required", { name: ["Required"] });
return notFound("Application not found");
```

### Authentication

```ts
import { requireAuth } from "@/lib/auth";

const auth = await requireAuth(request);
if (!auth.ok) return auth.response;
// auth.auth.userId, auth.auth.role, auth.auth.workspaceId
```

### RBAC

```ts
import { requirePermission } from "@/lib/rbac";

const authz = requirePermission(auth.auth, "create");
if (!authz.ok) return authz.response;
```

### Audit Logging

```ts
import { writeAuditLog, computeDiff } from "@/lib/audit";

await writeAuditLog({
  auth: auth.auth,
  action: "create",
  targetType: "Application",
  targetId: newApp.id,
  targetDisplayName: newApp.name,
  request,
});
```

### Pagination & Filtering

```ts
import {
  parseListParams,
  buildOrderBy,
  buildWhereConditions,
  buildPaginationMeta,
} from "@/lib/query";

const url = new URL(request.url);
const query = parseListParams(url.searchParams);

// Use query.pagination.offset, query.pagination.pageSize for LIMIT/OFFSET
// Use buildOrderBy(query.sort, columnMap) for ORDER BY
// Use buildWhereConditions(query.filters, columnMap) for WHERE
```

### Feature Flags

```ts
import { isFeatureEnabled, isApiEnabled } from "@/lib/feature-flags";

if (isApiEnabled("capabilities")) {
  // Fetch from API
} else {
  // Use static fixtures
}
```

## Environment Variables (Optional)

Add to `.env.local` to override feature flag defaults:

```env
# Disable API mode for specific modules (use static fixtures instead)
FEATURE_CAPABILITIES_API=false

# Disable RBAC checks during development
FEATURE_RBAC_ENABLED=false

# Disable audit logging during development
FEATURE_AUDIT_LOGGING=false
```
