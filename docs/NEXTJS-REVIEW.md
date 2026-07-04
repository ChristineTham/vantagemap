# Next.js Best Practices Review

Comprehensive review of the VantageMap codebase against Next.js 16 best practices.

**Date:** 2025-06-01  
**Next.js version:** 16.2.3  
**Files analysed:** ~100 pages/components, 60 route handlers, 44 client components

---

## Summary

| Category                      | Verdict                        | Issues           |
| ----------------------------- | ------------------------------ | ---------------- |
| Async params/searchParams     | ✅ Fully compliant             | 0                |
| RSC boundaries (async client) | ✅ Fully compliant             | 0                |
| Non-serializable props        | ✅ No violations               | 0                |
| Image optimization            | ✅ No raw `<img>` tags         | 0                |
| Route handler patterns        | ✅ Correct                     | 0                |
| Error handling (error.tsx)    | ✅ Root level                  | 0                |
| File conventions              | ✅ Correct structure           | 0                |
| Runtime selection             | ✅ Node.js default             | 0                |
| Loading states                | ⚠️ Partial coverage            | 4 missing        |
| Metadata/SEO                  | ⚠️ Partial coverage            | ~8 pages missing |
| Data fetching patterns        | ⚠️ Minor waterfalls            | 2 opportunities  |
| Suspense boundaries           | ⚠️ Missing for useSearchParams | 2 pages          |

---

## Findings

### ✅ PASS — Async Params & SearchParams

All dynamic pages and route handlers correctly type `params` as `Promise<...>` and `await` before accessing. Both patterns used correctly:

- Direct destructuring: `const { id } = await params`
- Context pattern: `const { id } = await context.params`
- CRUD factory: uses `Promise<Record<string, string>>`

### ✅ PASS — RSC Boundaries

Zero async client components found. All 44 `"use client"` files use `await` only inside event handlers or callbacks (not in component bodies). Maps, Sets, and Date objects are created within client components, not passed as props from server components.

### ✅ PASS — Image Optimization

No raw `<img>` tags anywhere in the codebase. All visual content uses Lucide React icons or SVGs.

### ✅ PASS — Route Handlers

- No `page.tsx` / `route.ts` coexistence conflicts
- All handlers use `Response.json()` or `NextResponse.json()` correctly
- Dynamic handlers properly await params

---

### ⚠️ MEDIUM — Missing `loading.tsx` in 4 Route Segments

Loading states exist for the 5 main views + detail/create pages, but these segments lack them:

| Route           | Impact                                         |
| --------------- | ---------------------------------------------- |
| `/admin/*`      | Admin pages show no skeleton during load       |
| `/search`       | Search results page has no loading indicator   |
| `/governance/*` | Governance hub/sub-pages load without skeleton |
| `/profile`      | Profile page has no loading state              |

**Recommendation:** Add `loading.tsx` to each. A simple skeleton pattern:

```tsx
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-48 rounded bg-rosely-blush/50" />
      <div className="h-64 rounded bg-rosely-blush/30" />
    </div>
  );
}
```

---

### ⚠️ MEDIUM — Missing Suspense Boundary for `useSearchParams`

Two client pages use `useSearchParams()` without being wrapped in a Suspense boundary:

| Page                                     | Hook                                  |
| ---------------------------------------- | ------------------------------------- |
| `src/app/(auth)/login/page.tsx`          | `useSearchParams()` for `callbackUrl` |
| `src/app/(auth)/reset-password/page.tsx` | `useSearchParams()` for `token`       |

In Next.js 15+, `useSearchParams()` in a client component causes the entire page to CSR-bailout unless wrapped in `<Suspense>`. This means the page cannot be statically generated and will show no fallback during hydration.

**Recommendation:** Wrap these pages (or their search-param-dependent section) in a Suspense boundary at the layout or page level. Since the `(auth)` group has its own layout, the simplest fix is there.

---

### ⚠️ LOW — Metadata Missing on ~8 Pages

Pages without `export const metadata` or `generateMetadata`:

- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/admin/users`, `/admin/roles`, `/admin/technical-users`
- `/profile`
- `/governance`

**Recommendation:** Add static metadata for SEO and browser tab titles:

```tsx
export const metadata: Metadata = {
  title: "Sign In — VantageMap",
};
```

---

### ⚠️ LOW — Minor Data Fetching Waterfall Opportunities

1. **`BulkEditDialog.tsx`** — Sequential update calls could use `Promise.all()` when processing multiple entities
2. **`RelationshipAddDialog.tsx`** — Search + create are sequential (acceptable since create depends on search result)

The `DocumentDetail.tsx` governance tab already uses `Promise.all()` correctly — this is the right pattern.

---

## What's Done Well

1. **Async params everywhere** — 100% compliance with Next.js 15+ async API changes
2. **Clean RSC/Client boundary** — No async client components, no non-serializable prop crossings
3. **Error boundaries** — Root `error.tsx`, `not-found.tsx`, and `loading.tsx` all present
4. **No raw images** — All visual content properly handled
5. **Metadata on main pages** — Dashboard, capabilities, applications, strategy, radar, roadmap, search, reports all covered
6. **Dynamic metadata** — `generateMetadata` used correctly with `await params` on detail pages
7. **Route handler hygiene** — No conflicting page/route files, proper response patterns
8. **Data patterns** — Server Components used for initial data fetch; client components use effects for interactive data; `Promise.all` for parallel fetches
9. **Node.js runtime** — No unnecessary Edge runtime usage
10. **Loading states** — Present on all 5 main navigation views + detail pages

---

## Remediation Priority

| #   | Issue                                                     | Effort  | Impact                       |
| --- | --------------------------------------------------------- | ------- | ---------------------------- |
| 1   | Add Suspense boundary for `useSearchParams` in auth pages | Small   | Prevents CSR bailout         |
| 2   | Add `loading.tsx` to admin/search/governance/profile      | Small   | Better perceived performance |
| 3   | Add metadata to auth/admin/profile/governance pages       | Trivial | SEO + browser tab titles     |
