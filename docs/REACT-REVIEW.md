# React & Performance Best Practices Review

Comprehensive review of the VantageMap codebase against the Vercel React Best Practices guide (40+ rules across 8 categories).

**Date:** 2025-06-01  
**Scope:** All pages, components, and route handlers

---

## Summary

| Category                  | Verdict     | Critical Issues                     |
| ------------------------- | ----------- | ----------------------------------- |
| Eliminating Waterfalls    | ⚠️ 5 issues | 2 critical (import loop, bulk tags) |
| Bundle Size Optimization  | ⚠️ 1 issue  | Recharts not dynamically imported   |
| Server-Side Performance   | ⚠️ 1 issue  | Audit logging blocks response       |
| Client-Side Data Fetching | ⚠️ Minor    | No SWR; useEffect-based fetches     |
| Re-render Optimization    | ✅ Good     | Correct useMemo patterns            |
| Barrel Imports            | ✅ Good     | Named imports throughout            |
| RSC Boundaries            | ✅ Good     | Proper serialization                |
| Server Action Auth        | ✅ N/A      | Uses route handlers with auth       |
| Module-Level State        | ✅ Safe     | No request-leaking state            |

---

## Findings by Priority

### 🔴 CRITICAL — Import Route: Sequential DB Loop

**File:** `src/app/api/import/route.ts`  
**Impact:** For 10,000 rows, this generates 20,000-30,000 sequential DB queries (3 per row).

```typescript
for (let i = 0; i < validRows.length; i++) {
  const row = validRows[i];
  const [existing] = await db.select(...).where(eq(table.id, row.id)).limit(1);
  if (existing) {
    await db.update(table).set(...).where(eq(table.id, row.id));
  } else {
    await db.insert(table).values(...);
  }
}
```

**Fix:** Batch operations using chunked `Promise.all()`:

```typescript
const BATCH_SIZE = 100;
for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
  const batch = validRows.slice(i, i + BATCH_SIZE);
  await Promise.all(
    batch.map(async (row) => {
      // upsert logic per row
    })
  );
}
```

Or better: use Drizzle's `onConflictDoUpdate()` for a single SQL upsert per batch.

---

### 🔴 CRITICAL — Bulk Tags: Nested Sequential Loop

**File:** `src/app/api/bulk/route.ts`  
**Impact:** For 100 entities × 20 tags = 2,000 sequential INSERT operations.

```typescript
for (const entity of entities) {
  for (const tagId of addTags) {
    await db.insert(tagAssignments).values({...}).onConflictDoNothing();
  }
}
```

**Fix:** Batch all inserts into a single multi-row insert:

```typescript
if (addTags.length > 0) {
  const values = entities.flatMap((entity) =>
    addTags.map((tagId) => ({
      tagId,
      documentType: entity.type,
      documentId: entity.id,
    }))
  );
  await db.insert(tagAssignments).values(values).onConflictDoNothing();
}
```

---

### 🟠 HIGH — Quality Seal Page: Sequential Loop

**File:** `src/app/governance/quality-seal/page.tsx`  
**Impact:** 4 independent API calls execute sequentially (~400ms wasted).

```typescript
for (const s of states) {
  const res = await filterByFacets({ qualitySeal: s.state });
  // ...
}
```

**Fix:** Use `Promise.all()`:

```typescript
const results = await Promise.all(
  states.map(async (s) => {
    try {
      const res = await filterByFacets({ qualitySeal: s.state, pageSize: "50" });
      return { ...s, items: res.data.results.map(...) };
    } catch {
      return { ...s, items: [] };
    }
  })
);
```

---

### 🟠 HIGH — Governance Stats: Sequential Fetches

**File:** `src/app/governance/page.tsx`  
**Impact:** Two independent API calls (facets + surveys) run sequentially.

```typescript
const facetsRes = await getFacets();
// ... process facets ...
const surveysRes = await getSurveys("active");
```

**Fix:** Parallelize with `Promise.all()`:

```typescript
const [facetsRes, surveysRes] = await Promise.all([
  getFacets().catch(() => null),
  getSurveys("active").catch(() => ({ data: [] })),
]);
```

---

### 🟠 HIGH — Recharts Not Dynamically Imported

**Files:** `DashboardCharts.tsx`, `ReportingCharts.tsx`, `CapabilityCoverageChart.tsx`  
**Impact:** ~80KB Recharts bundle loaded on every page visit regardless of whether charts are visible.

```typescript
import { BarChart, PieChart, ... } from "recharts";
```

**Fix:** Wrap chart components with `next/dynamic`:

```typescript
import dynamic from "next/dynamic";

const DashboardCharts = dynamic(() => import("@/components/DashboardCharts"), {
  loading: () => <div className="h-60 animate-pulse rounded bg-rosely-blush/30" />,
  ssr: false,
});
```

---

### 🟠 HIGH — Audit Logging Blocks Response

**File:** `src/lib/crud-factory.ts`  
**Impact:** Every mutation (create/update/delete) waits ~50-100ms for audit write before responding.

```typescript
await writeAuditLog({ auth, action, targetType, targetId, ... });
return ok(updated);
```

**Fix:** Use `after()` from `next/server` to make audit logging non-blocking:

```typescript
import { after } from "next/server";

// ... perform mutation ...
after(async () => {
  await writeAuditLog({ auth, action, targetType, targetId, ... });
});
return ok(updated);
```

---

### 🟡 MEDIUM — Webhook Route: Count + Select Waterfall

**File:** `src/app/api/webhooks/route.ts`  
**Impact:** Minor (~20ms). Count and data queries are independent but sequential.

```typescript
const [countResult] = await db.select({ value: count() }).from(webhooks);
const rows = await db.select(...).from(webhooks).limit(pageSize).offset(offset);
```

**Fix:** `Promise.all([countQuery, dataQuery])`.

---

### 🟡 MEDIUM — No SWR for Client Data Fetching

Multiple client components (`SearchBar`, `SearchPageView`, `SearchModal`, admin pages) fetch data via `useEffect` + `fetch()`. This means:

- No request deduplication across component instances
- No stale-while-revalidate caching
- Manual loading/error state management

**Recommendation:** Consider SWR or React Query for frequently-accessed client data (search results, admin lists). Low priority since most data fetching is server-side.

---

## What's Done Well

| Pattern                                | Evidence                                                                |
| -------------------------------------- | ----------------------------------------------------------------------- |
| **Promise.all() for parallel fetches** | Dashboard (5 parallel queries), Strategy, Radar, Reports, Detail pages  |
| **useMemo for derived state**          | ApplicationsView (filter → sort → paginate), TechRadarView, RoadmapView |
| **useCallback for stable references**  | DocumentDetail, DocumentEditDialog, DocumentCreateForm, admin pages  |
| **No barrel re-exports**               | Components imported individually, no `src/components/index.ts`          |
| **Minimal RSC props**                  | Pages pass only needed fields to client components                      |
| **No module-level mutable state**      | All `let` variables correctly scoped inside async functions             |
| **No async client components**         | All 44 client components use sync function signatures                   |
| **Server-side auth in every route**    | `requireAuth()` / `requirePermission()` in all handlers                 |

---

## Remediation Priority

| #   | Issue                                                           | Effort  | Impact                            |
| --- | --------------------------------------------------------------- | ------- | --------------------------------- |
| 1   | Batch import upserts (chunked Promise.all or single SQL upsert) | Medium  | Critical — 10-100× faster imports |
| 2   | Batch bulk tag operations (single multi-row insert)             | Small   | Critical — eliminates N² loop     |
| 3   | Parallelize quality-seal page queries (Promise.all)             | Small   | High — 4× faster page load        |
| 4   | Parallelize governance stats (Promise.all)                      | Small   | High — 2× faster page load        |
| 5   | Dynamic import Recharts (next/dynamic)                          | Small   | High — 80KB off initial bundle    |
| 6   | Non-blocking audit logging (after())                            | Small   | High — 50-100ms faster mutations  |
| 7   | Parallelize webhook count + select                              | Trivial | Medium — minor improvement        |
