# Phase 9 — CRUD and Editing UI — Codespaces Continuation Guide

## Status

Phase 9 code has been scaffolded locally. This document covers what was implemented, what needs testing, and what manual steps remain for validation in GitHub Codespaces.

---

## What Was Implemented

### Step 9.1 — Document Detail View

- **Route:** `src/app/[type]/[id]/page.tsx` — Universal dynamic route for any document type
- **Component:** `src/components/DocumentDetail.tsx` — Client Component with tabbed view (Details / Relationships / Audit History)
- **Loading:** `src/app/[type]/[id]/loading.tsx` — Skeleton loading state
- **Data layer:** `src/lib/data.ts` — Added `getEntityByTypeAndId()`, `getRelationshipsForEntity()`, and `searchAllEntities()` functions
- **Config registry:** `src/lib/document-config.ts` — Central metadata for all 12 document types (fields, slugs, API paths, form schemas)

### Step 9.2 — Create Document Form

- **Route:** `src/app/[type]/new/page.tsx` — Create page for any document type
- **Component:** `src/components/DocumentCreateForm.tsx` — Client Component with grouped fields, validation, and API submission
- **Loading:** `src/app/[type]/new/loading.tsx` — Skeleton loading state
- **Helper:** `src/components/CreateButton.tsx` — Reusable "Create New" button component

### Step 9.3 — Edit Document Form

- **Component:** `src/components/DocumentEditDialog.tsx` — Modal dialog for editing, with diff detection (only sends changed fields)
- Triggered from the detail view's "Edit" button

### Step 9.4 — Relationship Editor

- **Component:** `src/components/RelationshipList.tsx` — Lists relationships grouped by type, with add/remove controls
- **Component:** `src/components/RelationshipAddDialog.tsx` — Multi-step dialog: select relationship type → enter target entity ID → submit
- Uses `src/lib/relationship-rules.ts` VALID_RELATIONSHIP_PAIRS for type-safe options

### Step 9.5 — Bulk Edit UI

- **Component:** `src/components/BulkEditDialog.tsx` — Modal for bulk update (lifecycle, health, owner) or bulk delete with confirmation
- **Component:** `src/components/BulkSelectToolbar.tsx` — Floating toolbar that appears when items are multi-selected

### Step 9.6 — Search and Filter UI

- **Route:** `src/app/search/page.tsx` — Dedicated search page
- **Component:** `src/components/SearchPageView.tsx` — Client Component with search form, type filters, paginated results
- **Sidebar:** Updated `src/components/Sidebar.tsx` — Added "Search" nav item

### Page Enhancements

- **Applications page:** Added "New Application" create button and row-click navigation to detail view
- **Capabilities page:** Added "New Capability" create button

---

## How the Routing Works

The `[type]` dynamic segment maps to document slugs defined in `src/lib/document-config.ts`:

| Slug                | Type               | Detail URL                | Create URL               |
| ------------------- | ------------------ | ------------------------- | ------------------------ |
| `capabilities`      | BusinessCapability | `/capabilities/{id}`      | `/capabilities/new`      |
| `applications`      | Application        | `/applications/{id}`      | `/applications/new`      |
| `objectives`        | StrategicObjective | `/objectives/{id}`        | `/objectives/new`        |
| `initiatives`       | Initiative         | `/initiatives/{id}`       | `/initiatives/new`       |
| `it-components`     | ITComponent        | `/it-components/{id}`     | `/it-components/new`     |
| `organizations`     | Organization       | `/organizations/{id}`     | `/organizations/new`     |
| `data-objects`      | DataObject         | `/data-objects/{id}`      | `/data-objects/new`      |
| `interfaces`        | Interface          | `/interfaces/{id}`        | `/interfaces/new`        |
| `providers`         | Provider           | `/providers/{id}`         | `/providers/new`         |
| `platforms`         | Platform           | `/platforms/{id}`         | `/platforms/new`         |
| `tech-categories`   | TechCategory       | `/tech-categories/{id}`   | `/tech-categories/new`   |
| `business-contexts` | BusinessContext    | `/business-contexts/{id}` | `/business-contexts/new` |

---

## Testing and Validation in Codespaces

### 1. Install dependencies

```bash
npm install
```

### 2. Type-check

```bash
npx tsc --noEmit
```

Fix any TypeScript errors. Common issues to watch for:

- Unused import warnings from `eslint` (not blocking)
- Possible type narrowing needed for the `DocumentType` union usage in `data.ts`

### 3. Lint

```bash
npm run lint
```

### 4. Build

```bash
npm run build
```

### 5. Run dev server and test manually

```bash
npm run dev
```

Test these flows:

1. Navigate to `/applications` → click "New Application" → fill form → submit
2. Navigate to `/applications` → click a row → see detail view with tabs
3. On detail view → click "Edit" → change a field → save
4. On detail view → click "Delete" → type name to confirm → delete
5. On detail view → go to Relationships tab → click "Add Relationship" → select type and enter target ID
6. Navigate to `/search` → type a query → see results → click a result
7. Navigate to `/capabilities` → click "New Capability"

### 6. Run tests

```bash
npm run test
```

---

## Known Issues / Follow-up Work

1. **Bulk selection in list views** — The `BulkSelectToolbar` and `BulkEditDialog` are created as standalone components. They need to be integrated into the `ApplicationsView` (and other list views) with checkbox columns in the DataTable. This requires adding a multi-select state to each list view component.

2. **Relationship display names** — Currently, relationships show the target entity ID (truncated UUID). Ideally, the component should resolve entity names via an API call or pass them from the server. A lightweight solution: fetch entity names on the client when the Relationships tab opens.

3. **Audit History tab** — Currently renders a placeholder with skeleton loaders. Needs an API endpoint (`GET /api/audit?targetType=X&targetId=Y`) and a client-side fetch to display real audit entries.

4. **Route conflicts** — The `[type]` catch-all may conflict with existing static routes (`/capabilities`, `/applications`, etc.). If this causes 404s, add a route group or move the dynamic route to a prefix like `/(documents)/[type]/[id]`. Alternatively, if Next.js resolves static routes before dynamic ones (which it should), this should work without changes.

5. **Form validation** — Currently relies on HTML5 `required` attribute and server-side validation. Consider adding client-side Zod validation for richer error messages before submission.

6. **Relationship autocomplete** — The "Add Relationship" dialog currently requires manual entry of target entity UUID. A search-as-you-type autocomplete using the `/api/search` endpoint would improve UX.

---

## File Summary

New files created:

```text
src/lib/document-config.ts
src/app/[type]/[id]/page.tsx
src/app/[type]/[id]/loading.tsx
src/app/[type]/new/page.tsx
src/app/[type]/new/loading.tsx
src/app/search/page.tsx
src/components/DocumentDetail.tsx
src/components/DocumentCreateForm.tsx
src/components/DocumentEditDialog.tsx
src/components/DeleteConfirmDialog.tsx
src/components/RelationshipList.tsx
src/components/RelationshipAddDialog.tsx
src/components/BulkEditDialog.tsx
src/components/BulkSelectToolbar.tsx
src/components/SearchPageView.tsx
src/components/CreateButton.tsx
```

Modified files:

```text
src/lib/data.ts — Added relationship and search data access functions
src/components/Sidebar.tsx — Added Search nav item
src/app/applications/page.tsx — Added CreateButton, row-click navigation
src/app/capabilities/page.tsx — Added CreateButton
src/components/ApplicationsView.tsx — Added router and onRowClick
```

```

```
