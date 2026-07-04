# Phase 6 — Relationship and Search APIs: Codespaces Continuation Guide

## What was done (locally)

Phase 6 implements cross-entity operations that span multiple document types: relationship management, full-text search, faceted filtering, and bulk operations.

### New files created

| File                                      | Purpose                                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/lib/relationship-rules.ts`           | Relationship validation rules — defines all valid (source, target, type) triples from MODEL.md §4.4 |
| `src/app/api/relationships/route.ts`      | Relationship collection (GET list, POST single or bulk create)                                      |
| `src/app/api/relationships/[id]/route.ts` | Relationship individual (GET, PATCH, DELETE)                                                        |
| `src/app/api/search/route.ts`             | Cross-entity full-text search using PostgreSQL `ts_rank` + `to_tsvector`/`plainto_tsquery`          |
| `src/app/api/facets/route.ts`             | Facet values API (GET available filter values grouped by field)                                     |
| `src/app/api/facets/filter/route.ts`      | Faceted filter API (GET filtered results across entity types)                                       |
| `src/app/api/bulk/route.ts`               | Bulk operations (POST with `?action=` query param for update/delete/upsert)                         |

### Architecture decisions

1. **Relationship validation**: `src/lib/relationship-rules.ts` contains the master list of valid `(source, target, type)` triples from MODEL.md. Parent/child relationships are automatically valid for hierarchical types. Validation uses an O(1) Set-based lookup.

2. **Bulk relationship creation**: POST `/api/relationships` accepts either a single object or an array (max 100). Uses `ON CONFLICT DO NOTHING` for idempotency.

3. **Cross-entity search**: Uses PostgreSQL full-text search (`to_tsvector` + `plainto_tsquery`) with `ts_rank` for relevance ordering and `ts_headline` for result highlighting. Searches name and description fields across all 12 entity types via UNION ALL. Results returned both flat (paginated) and grouped by type.

4. **Faceted filter API**: Two endpoints:
   - `GET /api/facets` — returns distinct values and counts for type, lifecycle, health, qualitySeal, and tags
   - `GET /api/facets/filter` — returns entities matching multi-facet criteria across types

5. **Bulk operations**: Single endpoint (`POST /api/bulk`) with `?action=` query parameter:
   - `?action=update` (default) — bulk update lifecycle, health, qualitySeal, owner; add/remove tags
   - `?action=delete` — bulk delete with cascade cleanup (tags, subscriptions, relationships)
   - `?action=upsert` — idempotent insert-or-update by name for import workflows

6. **Audit logging**: All mutation operations audit-log each affected entity individually. Bulk operations produce one audit entry per entity.

7. **Feature flags added**: `FEATURE_SEARCH_API`, `FEATURE_RELATIONSHIPS_API`, `FEATURE_BULK_API` (all default true).

---

## Steps to complete in Codespaces

### 1. Install dependencies (if not already done)

```bash
npm install
```

### 2. Type-check

```bash
npx tsc --noEmit
```

Fix any TypeScript issues. The most likely issues will be around:

- The `sql.raw()` return types from Drizzle (may need type assertions)
- The `requirePermission` parameter typing for the auth context

### 3. Lint

```bash
npm run lint
```

Fix any ESLint warnings (likely unused import or formatting issues).

### 4. Build

```bash
npm run build
```

Ensure all route handlers compile cleanly.

### 5. Run development server

```bash
npm run dev
```

### 6. Smoke-test the APIs

Ensure `DATABASE_URL` is set and the database is seeded (`npm run db:seed`).

Use the `x-dev-user-id` header for dev-mode auth bypass (use an admin user ID from seed data).

#### 6.1 Relationship CRUD

```bash
# List all relationships
curl -s http://localhost:3000/api/relationships \
  -H "x-dev-user-id: <admin-user-id>" | jq .

# Filter relationships by source
curl -s "http://localhost:3000/api/relationships?sourceType=Application&sourceId=<app-uuid>" \
  -H "x-dev-user-id: <admin-user-id>" | jq .

# Create a single relationship
curl -s -X POST http://localhost:3000/api/relationships \
  -H "Content-Type: application/json" \
  -H "x-dev-user-id: <admin-user-id>" \
  -d '{
    "sourceType": "Application",
    "sourceId": "<app-uuid>",
    "targetType": "BusinessCapability",
    "targetId": "<cap-uuid>",
    "relationshipType": "supports"
  }' | jq .

# Bulk create relationships
curl -s -X POST http://localhost:3000/api/relationships \
  -H "Content-Type: application/json" \
  -H "x-dev-user-id: <admin-user-id>" \
  -d '[
    {"sourceType": "Application", "sourceId": "<app1>", "targetType": "BusinessCapability", "targetId": "<cap1>", "relationshipType": "supports"},
    {"sourceType": "Application", "sourceId": "<app2>", "targetType": "BusinessCapability", "targetId": "<cap2>", "relationshipType": "supports"}
  ]' | jq .

# Test invalid relationship type (should return 400)
curl -s -X POST http://localhost:3000/api/relationships \
  -H "Content-Type: application/json" \
  -H "x-dev-user-id: <admin-user-id>" \
  -d '{
    "sourceType": "Provider",
    "sourceId": "<uuid>",
    "targetType": "Application",
    "targetId": "<uuid>",
    "relationshipType": "supports"
  }' | jq .

# Update a relationship
curl -s -X PATCH http://localhost:3000/api/relationships/<rel-uuid> \
  -H "Content-Type: application/json" \
  -H "x-dev-user-id: <admin-user-id>" \
  -d '{"description": "Updated description", "metadata": {"cost": 50000}}' | jq .

# Delete a relationship
curl -s -X DELETE http://localhost:3000/api/relationships/<rel-uuid> \
  -H "x-dev-user-id: <admin-user-id>"
```

#### 6.2 Cross-entity Search

```bash
# Search across all types
curl -s "http://localhost:3000/api/search?q=customer" \
  -H "x-dev-user-id: <admin-user-id>" | jq .

# Search specific types
curl -s "http://localhost:3000/api/search?q=SAP&types=Application,ITComponent" \
  -H "x-dev-user-id: <admin-user-id>" | jq .

# Verify highlighting in results
curl -s "http://localhost:3000/api/search?q=management" \
  -H "x-dev-user-id: <admin-user-id>" | jq '.data.results[0].headline'
```

#### 6.3 Faceted Filter

```bash
# Get all facet values
curl -s http://localhost:3000/api/facets \
  -H "x-dev-user-id: <admin-user-id>" | jq .

# Get facets for specific types
curl -s "http://localhost:3000/api/facets?types=Application,ITComponent" \
  -H "x-dev-user-id: <admin-user-id>" | jq .

# Filter by lifecycle and type
curl -s "http://localhost:3000/api/facets/filter?types=Application&lifecycle=Active,Phase%20In" \
  -H "x-dev-user-id: <admin-user-id>" | jq .

# Multi-facet filter
curl -s "http://localhost:3000/api/facets/filter?types=Application,Initiative&health=Good,Excellent&lifecycle=Active" \
  -H "x-dev-user-id: <admin-user-id>" | jq .
```

#### 6.4 Bulk Operations

```bash
# Bulk update lifecycle
curl -s -X POST http://localhost:3000/api/bulk \
  -H "Content-Type: application/json" \
  -H "x-dev-user-id: <admin-user-id>" \
  -d '{
    "entities": [
      {"id": "<app1-uuid>", "type": "Application"},
      {"id": "<app2-uuid>", "type": "Application"}
    ],
    "fields": {"lifecycle": "Phase Out"}
  }' | jq .

# Bulk add tags
curl -s -X POST http://localhost:3000/api/bulk \
  -H "Content-Type: application/json" \
  -H "x-dev-user-id: <admin-user-id>" \
  -d '{
    "entities": [
      {"id": "<app1-uuid>", "type": "Application"},
      {"id": "<cap1-uuid>", "type": "BusinessCapability"}
    ],
    "addTags": ["<tag-uuid>"]
  }' | jq .

# Bulk delete
curl -s -X POST "http://localhost:3000/api/bulk?action=delete" \
  -H "Content-Type: application/json" \
  -H "x-dev-user-id: <admin-user-id>" \
  -d '{
    "entities": [
      {"id": "<uuid>", "type": "Application"}
    ]
  }' | jq .

# Bulk upsert (import workflow)
curl -s -X POST "http://localhost:3000/api/bulk?action=upsert" \
  -H "Content-Type: application/json" \
  -H "x-dev-user-id: <admin-user-id>" \
  -d '{
    "items": [
      {"type": "Application", "name": "New Import App", "description": "Imported via bulk", "lifecycle": "Active"},
      {"type": "Application", "name": "SAP S/4HANA", "description": "Updated via upsert", "owner": "IT Dept"}
    ]
  }' | jq .
```

### 7. Performance validation

The search API should return results within 300ms (p95) as required by nfr.md. For the MVP dataset this should be well under that threshold with PostgreSQL FTS. If you need to optimise later:

1. Add GIN indexes on `to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))` for each table
2. Consider materialised views for cross-entity search if UNION ALL becomes slow at scale

```sql
-- Example: Add GIN index for full-text search on applications
CREATE INDEX idx_applications_fts ON applications
USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Repeat for other tables as needed
CREATE INDEX idx_business_capabilities_fts ON business_capabilities
USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
```

### 8. Optional: Create a migration for FTS indexes

If search performance is acceptable without indexes on the seed dataset, defer this to when real data volume demands it. Otherwise:

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Or create a manual SQL migration in `drizzle/` adding GIN indexes.

---

## API Summary

| Endpoint                  | Method | Purpose                                  |
| ------------------------- | ------ | ---------------------------------------- |
| `/api/relationships`      | GET    | List/filter relationships                |
| `/api/relationships`      | POST   | Create single or bulk relationships      |
| `/api/relationships/[id]` | GET    | Get single relationship                  |
| `/api/relationships/[id]` | PATCH  | Update relationship description/metadata |
| `/api/relationships/[id]` | DELETE | Delete a relationship                    |
| `/api/search`             | GET    | Full-text search across all entity types |
| `/api/facets`             | GET    | Get available facet values for filtering |
| `/api/facets/filter`      | GET    | Filter entities with faceted criteria    |
| `/api/bulk`               | POST   | Bulk update (default)                    |
| `/api/bulk?action=delete` | POST   | Bulk delete with cascade                 |
| `/api/bulk?action=upsert` | POST   | Idempotent upsert for imports            |

---

## Known considerations

1. **SQL injection protection**: The search and facet APIs use string interpolation for UNION ALL queries (Drizzle doesn't support dynamic table UNION). Values are escaped via `replace(/'/g, "''")` and `plainto_tsquery` (which safely handles user input). For production, consider parameterised queries or prepared statements.

2. **Audit logging for relationships**: Relationships don't have their own `DocumentType` in the audit system. They're logged under `"BusinessCapability"` as a placeholder. Consider adding `"Relationship"` to the `DocumentType` union if you want cleaner audit trails.

3. **Bulk operation limits**: All bulk endpoints enforce max 100 entities per request. This prevents timeout and memory issues on serverless.

4. **Upsert matching**: The bulk upsert matches by `name` (case-sensitive). For production imports, you may want to add `external_id` columns to tables for stable matching keys.
