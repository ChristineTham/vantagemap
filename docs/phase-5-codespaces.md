# Phase 5 — Entity CRUD APIs: Codespaces Continuation Guide

## What was done (locally)

All 10 entity CRUD route handlers have been implemented using a **shared CRUD factory** pattern:

### New files created

| File                                        | Purpose                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `src/lib/crud-factory.ts`                   | Generic CRUD route handler factory (list, getById, create, update, delete) |
| `src/app/api/capabilities/route.ts`         | Business Capability collection (GET, POST)                                 |
| `src/app/api/capabilities/[id]/route.ts`    | Business Capability individual (GET, PATCH, DELETE)                        |
| `src/app/api/applications/route.ts`         | Application collection (GET, POST)                                         |
| `src/app/api/applications/[id]/route.ts`    | Application individual (GET, PATCH, DELETE)                                |
| `src/app/api/objectives/route.ts`           | Strategic Objective collection (GET, POST)                                 |
| `src/app/api/objectives/[id]/route.ts`      | Strategic Objective individual (GET, PATCH, DELETE)                        |
| `src/app/api/initiatives/route.ts`          | Initiative collection (GET, POST)                                          |
| `src/app/api/initiatives/[id]/route.ts`     | Initiative individual (GET, PATCH, DELETE)                                 |
| `src/app/api/it-components/route.ts`        | IT Component / Radar Entry collection (GET, POST)                          |
| `src/app/api/it-components/[id]/route.ts`   | IT Component individual (GET, PATCH, DELETE)                               |
| `src/app/api/tech-categories/route.ts`      | Tech Category collection (GET, POST)                                       |
| `src/app/api/tech-categories/[id]/route.ts` | Tech Category individual (GET, PATCH, DELETE)                              |
| `src/app/api/organizations/route.ts`        | Organization collection (GET, POST)                                        |
| `src/app/api/organizations/[id]/route.ts`   | Organization individual (GET, PATCH, DELETE)                               |
| `src/app/api/data-objects/route.ts`         | Data Object collection (GET, POST)                                         |
| `src/app/api/data-objects/[id]/route.ts`    | Data Object individual (GET, PATCH, DELETE)                                |
| `src/app/api/interfaces/route.ts`           | Interface collection (GET, POST)                                           |
| `src/app/api/interfaces/[id]/route.ts`      | Interface individual (GET, PATCH, DELETE)                                  |
| `src/app/api/providers/route.ts`            | Provider collection (GET, POST)                                            |
| `src/app/api/providers/[id]/route.ts`       | Provider individual (GET, PATCH, DELETE)                                   |
| `src/app/api/platforms/route.ts`            | Platform collection (GET, POST)                                            |
| `src/app/api/platforms/[id]/route.ts`       | Platform individual (GET, PATCH, DELETE)                                   |

### Architecture decisions

1. **CRUD Factory** (`src/lib/crud-factory.ts`): A generic factory that produces route handlers for any Drizzle table. Eliminates code duplication across 10 entity types. Each entity file is ~45 lines (config + schema) rather than ~200 lines of duplicated handler logic.

2. **PATCH not PUT**: All update endpoints use `PATCH` (partial update) rather than `PUT` (full replace). The Zod `updateSchema` is always `.partial()` of the `createSchema`.

3. **Validation**: Each entity defines its own `createSchema` (for POST) and `updateSchema` (for PATCH) using Zod, with enum values matching the PostgreSQL enum definitions exactly.

4. **Column maps**: Each entity exposes a `columnMap` for sortable/filterable fields. Only fields explicitly listed can be sorted or filtered on (defense against injection).

---

## Steps to complete in Codespaces

### 1. Install dependencies (if not already done)

```bash
npm install
```

### 2. Type-check

```bash
npm run type-check
```

Expected: zero errors. All route files passed the VS Code TypeScript language server without errors.

### 3. Lint

```bash
npm run lint
```

Fix any ESLint issues that arise (most likely formatting-only with Prettier).

### 4. Build

```bash
npm run build
```

Ensures Next.js can compile all route handlers and the CRUD factory.

### 5. Run development server

```bash
npm run dev
```

### 6. Smoke-test the APIs

Ensure `DATABASE_URL` is set to your Neon connection string and the database has been seeded (`npm run db:seed`).

Use the `x-dev-user-id` header for dev-mode auth bypass:

```bash
# List capabilities (paginated)
curl -s http://localhost:3000/api/capabilities \
  -H "x-dev-user-id: admin-user-id" | jq .

# Get a single capability by ID
curl -s http://localhost:3000/api/capabilities/<some-uuid> \
  -H "x-dev-user-id: admin-user-id" | jq .

# Create a capability
curl -s -X POST http://localhost:3000/api/capabilities \
  -H "x-dev-user-id: admin-user-id" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Capability", "level": "1"}' | jq .

# Update a capability
curl -s -X PATCH http://localhost:3000/api/capabilities/<id> \
  -H "x-dev-user-id: admin-user-id" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated desc"}' | jq .

# Delete a capability
curl -s -X DELETE http://localhost:3000/api/capabilities/<id> \
  -H "x-dev-user-id: admin-user-id" -w "%{http_code}"
# Should return 204
```

Repeat similar patterns for other entities:

- `/api/applications`
- `/api/objectives`
- `/api/initiatives`
- `/api/it-components`
- `/api/tech-categories`
- `/api/organizations`
- `/api/data-objects`
- `/api/interfaces`
- `/api/providers`
- `/api/platforms`

### 7. Test query parameters

```bash
# Pagination
curl -s "http://localhost:3000/api/applications?page=1&pageSize=5" \
  -H "x-dev-user-id: admin-user-id" | jq .meta

# Sorting
curl -s "http://localhost:3000/api/applications?sortBy=name&sortDirection=asc" \
  -H "x-dev-user-id: admin-user-id" | jq '.data[].name'

# Filtering (exact match)
curl -s "http://localhost:3000/api/applications?filter[lifecycle]=Active" \
  -H "x-dev-user-id: admin-user-id" | jq .meta.total

# Filtering (partial text search)
curl -s "http://localhost:3000/api/applications?search[name]=SAP" \
  -H "x-dev-user-id: admin-user-id" | jq '.data[].name'
```

### 8. Test RBAC

```bash
# Viewer can list but not create
curl -s -X POST http://localhost:3000/api/capabilities \
  -H "x-dev-user-id: viewer-user-id" \
  -H "Content-Type: application/json" \
  -d '{"name": "Should Fail"}' | jq .error
# Expected: 403 with "Role 'Viewer' is not permitted..."

# Member can create/edit but not delete
curl -s -X DELETE http://localhost:3000/api/capabilities/<id> \
  -H "x-dev-user-id: member-user-id" -w "%{http_code}"
# Expected: 403
```

### 9. Verify audit logging

After mutations, check that audit entries were created:

```bash
# Check via Drizzle Studio
npm run db:studio
# Navigate to audit_entries table
```

Or query directly:

```sql
SELECT * FROM audit_entries ORDER BY created_at DESC LIMIT 10;
```

---

## Troubleshooting

| Issue                              | Fix                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `Cannot find module '@/db/schema'` | Run `npm install` — tsconfig path alias needs compiled TS                   |
| 401 on all requests                | Ensure `NODE_ENV=development` is set (enables dev bypass)                   |
| Empty results from list            | Run `npm run db:seed` to populate test data                                 |
| 500 errors                         | Check terminal output for `[API Error]` logs — likely a DB connection issue |
| `column "xxx" does not exist`      | Run `npm run db:push` to sync schema to database                            |

---

## What's next (Phase 6)

Phase 6 builds on Phase 5 with:

- 6.1 Relationship CRUD API (create/manage edges between documents)
- 6.2 Cross-entity search API (full-text search across all types)
- 6.3 Faceted filter API (combined multi-field filtering)
- 6.4 Bulk operations API (batch updates/deletes)
