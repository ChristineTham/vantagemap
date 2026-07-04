# Phase 8 — Frontend Views: Codespaces Continuation Guide

## What was done (locally)

All six frontend views have been implemented as Next.js 16 Server Component pages (with Client Component sub-views for interactivity). Each page fetches data via `src/lib/data.ts` and renders using the shared component library from Phase 7.

### New files created

| File                                  | Purpose                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                    | Dashboard — summary cards, health distribution pie chart, initiative status bar chart, attention alerts, navigation cards |
| `src/components/DashboardCharts.tsx`  | Client Component with Recharts (PieChart + BarChart) for dashboard                                                        |
| `src/app/capabilities/page.tsx`       | Business Capability Map — hierarchical 3-level layout with health indicators                                              |
| `src/app/capabilities/loading.tsx`    | Loading skeleton for capabilities route                                                                                   |
| `src/app/applications/page.tsx`       | Application Portfolio — server-side data fetch, delegates to client view                                                  |
| `src/app/applications/loading.tsx`    | Loading skeleton for applications route                                                                                   |
| `src/components/ApplicationsView.tsx` | Client Component — interactive table with search, filter by health/lifecycle, sort, pagination                            |
| `src/app/strategy/page.tsx`           | Strategy Map — Balanced Scorecard with 4 perspectives (Financial, Customer, Internal Process, Learning & Growth)          |
| `src/app/strategy/loading.tsx`        | Loading skeleton for strategy route                                                                                       |
| `src/app/radar/page.tsx`              | Technology Radar — server-side fetch, delegates to client view                                                            |
| `src/app/radar/loading.tsx`           | Loading skeleton for radar route                                                                                          |
| `src/components/TechRadarView.tsx`    | Client Component — filterable quadrant grid with ring groups, search, filter by ring/quadrant                             |
| `src/app/roadmap/page.tsx`            | Strategic Roadmap — server-side fetch, delegates to client view                                                           |
| `src/app/roadmap/loading.tsx`         | Loading skeleton for roadmap route                                                                                        |
| `src/components/RoadmapView.tsx`      | Client Component — Gantt-style timeline with colored bars, summary table, search/filter                                   |

### Modified files

| File               | Changes                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `src/app/page.tsx` | Replaced placeholder with full dashboard (async, data-fetching, charts) |
| `docs/PLAN.md`     | Marked Phase 8 as ✅                                                    |

### Architecture decisions

1. **Server-first rendering**: All pages are Server Components that `await` data functions. Interactive features (search, filter, sort, pagination) are delegated to a `*View` Client Component that receives pre-fetched data as props. This avoids unnecessary client-side fetching and waterfalls.

2. **Recharts for charts**: The dashboard uses Recharts (already in dependencies) for the health distribution pie chart and initiative status bar chart. Charts are isolated in `DashboardCharts.tsx` so the main page remains a Server Component.

3. **Hierarchical capability layout**: The `/capabilities` page organizes capabilities into a nested card layout: Level 1 (domains) → Level 2 (areas) → Level 3 (capabilities). Each level has distinct visual styling with colour-coded borders.

4. **Balanced Scorecard layout**: The `/strategy` page groups objectives into the standard 4 BSC perspectives with colour-coded lanes: Financial (golden), Customer (teal), Internal Process (cornflower), Learning & Growth (lilac).

5. **CSS-based Gantt chart**: The `/roadmap` page uses a pure CSS Gantt chart (positioned bars within a timeline grid) rather than a heavy charting library. This keeps the bundle small and works well for the scope of data.

6. **Quadrant + Ring grouping for radar**: Technologies are grouped by quadrant (4 grid cells) with ring badges within each quadrant. This is simpler and more accessible than an SVG radar, while still communicating the same information.

---

## Steps to complete in Codespaces

### 1. Install dependencies (if not already done)

```bash
npm install
```

### 2. Install shadcn/ui components (if not done in Phase 7)

```bash
npx shadcn@latest add button card table dialog tabs badge input
```

### 3. Type-check

```bash
npx tsc --noEmit
```

**Potential issues:**

- `HealthIndicator` component was recreated — if there's a duplicate, delete the older one and keep the version that matches imports
- Ensure `src/lib/data.ts` exports `getCapability` (singular) in addition to `getCapabilities`
- If TypeScript errors on unused imports (`Link` in capabilities page), just remove the unused import

### 4. Lint

```bash
npm run lint
```

### 5. Build

```bash
npm run build
```

### 6. Set up environment

Ensure these environment variables are configured:

```bash
# Required
DATABASE_URL=postgresql://...  # Neon connection string

# Optional (defaults are fine for dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEV_USER_ID=admin-user-id

# Feature flags (all default to enabled)
FEATURE_CAPABILITIES_API=true
FEATURE_APPLICATIONS_API=true
FEATURE_STRATEGY_API=true
FEATURE_ROADMAP_API=true
FEATURE_RADAR_API=true
```

### 7. Seed the database

```bash
npm run db:seed
```

This populates the database with sample data so all views have something to display.

### 8. Run development server

```bash
npm run dev
```

### 9. Visual smoke-test

Open each route and verify:

| Route           | What to check                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/` (Dashboard) | Summary cards with counts, pie chart (health), bar chart (initiative status), attention alerts for critical apps, navigation cards |
| `/capabilities` | Hierarchical 3-level layout with colour-coded borders, health dots, lifecycle tags                                                 |
| `/applications` | Table with sortable columns, search input, health/lifecycle filter dropdowns, pagination                                           |
| `/strategy`     | 4 perspective lanes (Financial=golden, Customer=teal, Internal=cornflower, Learning=lilac), objective cards with health dots       |
| `/radar`        | 4-quadrant grid, ring badges within each quadrant, search + ring/quadrant filters                                                  |
| `/roadmap`      | Gantt timeline with month headers, coloured bars by status, summary table below, search + status filter                            |

### 10. Verify loading states

Simulate slow network by throttling in browser DevTools:

- Each route should show a `PageSkeleton` while loading
- The root `/` should show a skeleton on hard refresh

### 11. Test empty states

Temporarily disable data by setting feature flags to `false`:

```bash
FEATURE_CAPABILITIES_API=false npm run dev
```

Each page should show an `EmptyState` component with a relevant icon and message.

---

## Component architecture

```
src/app/page.tsx (Server)
  └── DashboardCharts (Client) — Recharts

src/app/capabilities/page.tsx (Server)
  └── renders hierarchical layout directly (no client wrapper needed)

src/app/applications/page.tsx (Server)
  └── ApplicationsView (Client)
      ├── SearchInput
      ├── DataTable + useTableSort
      ├── HealthBadge / LifecycleTag
      └── Pagination

src/app/strategy/page.tsx (Server)
  └── renders BSC perspectives directly

src/app/radar/page.tsx (Server)
  └── TechRadarView (Client)
      ├── SearchInput
      ├── StatusBadge (ring badges)
      └── HealthIndicator

src/app/roadmap/page.tsx (Server)
  └── RoadmapView (Client)
      ├── SearchInput
      ├── StatusBadge (initiative status)
      ├── HealthIndicator
      └── CSS Gantt bars
```

---

## Known limitations (to address in Phase 9+)

1. **No detail/edit pages**: Clicking a row or card doesn't navigate anywhere yet. Phase 9 adds `/[type]/[id]` detail views.
2. **No relationship data in views**: Capability map doesn't show linked applications, strategy map doesn't show linked initiatives. These require relationship API calls which will be added when detail views are built.
3. **Static Gantt**: The roadmap Gantt is pure CSS — no drag-to-resize or interactive date editing.
4. **No real-time updates**: Data is fetched once at render time. WebSocket/polling will come in a later phase.
5. **Chart interactivity**: Recharts tooltips work, but clicking a chart slice doesn't filter the view below.

---

## Ready for Phase 9

Phase 8 provides all read-only views. Phase 9 adds:

- 9.1: Universal detail page (`/[type]/[id]`) showing all fields, relationships, audit history
- 9.2: Create document form (modal or page-based)
- 9.3: Edit document form (inline or page-based)
- 9.4: Relationship editor
