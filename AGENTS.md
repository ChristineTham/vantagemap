<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# VantageMap — Project Guidelines

**Version: V1 (MVP) — Feature Complete**

## Project Overview

VantageMap is an enterprise architecture and business strategy platform. It gives Chief Strategy Officers, Business Architects, and Product Leaders a unified view of business capabilities, applications, strategy objectives, technology health, and roadmap initiatives.

### Routes

| Route           | View                              | Description                                                      |
| --------------- | --------------------------------- | ---------------------------------------------------------------- |
| `/`             | Dashboard                         | Summary cards, health charts, reporting widgets                  |
| `/capabilities` | Business Capability Map           | Hierarchical capability tree with health indicators              |
| `/applications` | Application Portfolio             | Filterable table with fit scores, lifecycle, TIME classification |
| `/strategy`     | Strategy Map (Balanced Scorecard) | Objectives by perspective, linked KPIs and initiatives           |
| `/radar`        | Technology Radar                  | Quadrant/ring visualization (Adopt/Trial/Assess/Hold)            |
| `/roadmap`      | Strategic Roadmap (Gantt)         | Timeline of initiatives with status and milestones               |
| `/reports`      | Reports and Analytics             | Portfolio health, TIME, 6R, obsolescence, coverage               |
| `/search`       | Cross-Entity Search               | Full-text search with faceted filtering                          |
| `/governance`   | Governance Hub                    | Quality seal, tags, surveys, data stewardship                    |
| `/admin/*`      | Administration                    | User management, roles, API tokens, technical users              |
| `/profile`      | User Profile                      | Account settings, password change, notifications                 |
| `/[type]/[id]`  | Document Detail                 | Universal detail view for any entity                             |
| `/[type]/new`   | Create Document                 | Entity creation form                                             |

## Tech Stack

### Frontend

- **Next.js 16.2.6** — App Router only. No Pages Router. No `getServerSideProps`/`getStaticProps`.
- **React 19.2.6** — Server Components by default, Client Components for interactivity
- **TypeScript 6** — strict mode
- **Tailwind CSS v4** — configured via `@import "tailwindcss"` in globals.css (NOT `@tailwind` directives)
- **Rosely colour palette** — custom CSS variables + Tailwind theme; see [DESIGN.md](DESIGN.md)
- **shadcn/ui (Radix UI primitives)** — installed in `src/components/ui/` (dialog, alert-dialog, button, input, label, badge, alert, separator, skeleton, dropdown-menu, card, select, textarea); the interactive components build on `@radix-ui/*` primitives (the default shadcn/ui stack)
- **Lucide React** — icon set
- **Recharts 3** — chart library (loaded dynamically with `next/dynamic`)

### Backend

- **PostgreSQL 16** — primary database ([ADR-001](docs/adr/001-database.md))
- **Neon Serverless** — HTTP driver (`@neondatabase/serverless`), stateless queries ([review](docs/review-neon.md))
- **Drizzle ORM** — schema-as-code, SQL-like queries, 31 application tables (plus 5 Better Auth core tables = 36 total), 27 enums ([ADR-002](docs/adr/002-orm.md))
- **Better Auth** — email/password auth, sessions, RBAC, API tokens ([ADR-003](docs/adr/003-authentication.md))
- **Next.js Route Handlers (REST)** — 29 API route groups ([ADR-004](docs/adr/004-api-layer.md))
- **GraphQL** — query endpoint with relationship traversal and depth limiting
- **PostgreSQL Full-Text Search** — cross-entity search with highlighting ([ADR-006](docs/adr/006-search.md))
- **Webhooks** — HMAC-signed delivery with exponential-backoff retry

### Hosting

- **Vercel Hobby** — MVP deployment (zero-cost) ([ADR-007](docs/adr/007-hosting.md))
- **Azure App Service** — production deployment target
- **Neon Free** — PostgreSQL hosting for MVP

## Build and Test

```bash
npm install        # install deps
npm run dev        # dev server (http://localhost:3000)
npm run build      # production build
npm run lint       # ESLint
npm run test       # Vitest (569 tests across 18 test files)
npm run type-check # TypeScript strict
npm run db:migrate # run database migrations
npm run db:seed    # populate sample data
npm run db:studio  # Drizzle Studio GUI
```

## Project Structure

```
src/
  app/
    page.tsx                  # Dashboard
    layout.tsx                # Root layout (wraps children in <AppShell>)
    (auth)/                   # Login, register, forgot/reset password
    admin/                    # User management, roles, API tokens
    governance/               # Quality seal, surveys, tags
    profile/                  # User profile settings
    reports/                  # Reporting and analytics
    search/                   # Cross-entity search
    [type]/                   # Universal document detail/create
    api/                      # 29 API route groups (REST + GraphQL)
    capabilities/page.tsx     # Business Capability Map
    applications/page.tsx     # Application Portfolio
    strategy/page.tsx         # Strategy Map
    radar/page.tsx            # Technology Radar
    roadmap/page.tsx          # Strategic Roadmap
  components/
    ui/                       # shadcn/ui primitives (13 components)
    Sidebar.tsx               # Navigation sidebar
    DataTable.tsx             # Reusable data table
    ...                       # 40+ shared components
  db/
    index.ts                  # Neon HTTP connection (Proxy pattern)
    schema/                   # 13 schema files (+ index barrel), 31 application tables (36 incl. Better Auth)
    migrate.ts                # Migration runner
    seed.ts                   # Idempotent seed script
  lib/
    api-response.ts           # Standard response envelope
    api.ts                    # Typed fetch client
    auth-server.ts            # Better Auth server config
    auth-client.ts            # Better Auth client
    crud-factory.ts           # Shared CRUD route handler factory
    data.ts                   # TypeScript types + data layer
    feature-flags.ts          # Environment-based feature flags
    graphql-schema.ts         # GraphQL schema definition
    neon-retry.ts             # Retry utility for transient failures
    openapi.ts                # OpenAPI 3.1 spec
    quality-seal.ts           # Quality seal state machine
    query.ts                  # Pagination/filter/sort utilities
    rbac.ts                   # Role-based access control
    relationship-rules.ts    # Relationship type validation
    reports.ts                # Reporting aggregation queries
    types.ts                  # Shared TypeScript types
    webhook-engine.ts         # Webhook delivery engine
  proxy.ts                    # Auth route protection (Next.js proxy, exports proxy())
  env.ts                      # Environment validation (Zod)
docs/
  PLAN.md                     # V1 MVP plan (Phases 0–13, all complete)
  PLANV4.md                   # Post-MVP roadmap (Phases 14+)
  TESTING.md                  # Testing and verification guide
  adr/                        # 8 architecture decision records
  phase-0/                    # Requirements, epics, NFRs, gates
```

## Architecture Conventions

- All pages: `src/app/<route>/page.tsx` (Server Components by default)
- Client Components: add `"use client"` only for state, effects, browser APIs
- Components: `src/components/` — reusable UI pieces
- Data layer: `src/lib/data.ts` — typed models and API access
- Database: `src/db/schema/` — Drizzle schema-as-code
- API routes: `src/app/api/<resource>/route.ts` — REST with standard envelope
- Path alias: `@/` maps to `src/`
- Layout: `src/app/layout.tsx` wraps every page in `<AppShell>` (`src/components/AppShell.tsx`), which renders `<Sidebar />` + `<main>` for authenticated users and full-width `<main>` for unauthenticated/pending states
- Environment: validated at startup via `src/env.ts` (skip with `SKIP_ENV_VALIDATION=true`)

## Key Conventions

- Use `@/lib/data` imports for all data access — do not inline data in page files
- Use Rosely colour tokens (`text-rosely-night`, `bg-rosely-cream`, etc.) — do not use raw hex or arbitrary Tailwind values. See [DESIGN.md](DESIGN.md) for the full design system.
- Use shadcn/ui components from `@/components/ui/` for buttons, cards, dialogs, tables, etc. — do not build custom primitives
- Use `size-N` (not `h-N w-N`) for equal-dimension icons
- Use `flex flex-col gap-N` (not `space-y-N`) for vertical spacing
- Server Components by default; add `"use client"` only when state/effects/browser APIs are needed
- Icon imports come from `lucide-react`
- For new pages, follow the pattern in existing `page.tsx` files
- Dark mode: `.dark` class on `<html>`, controlled by `ThemeToggle` component
- Database queries: use `withRetry()` from `@/lib/neon-retry` for critical operations

## Next.js 16 Breaking Changes to Watch

- `params` and `searchParams` in page components are now **async** — must be awaited
- Image, Script, and Font APIs may differ from Next.js 13/14 training data
- Use `after()` from `next/server` for non-blocking post-response work (audit logging)
- Use `next/dynamic` with `ssr: false` for client-only libraries (Recharts)
- When in doubt: `node_modules/next/dist/docs/`

## API Patterns

- **Response envelope**: `{ data: T }` (single), `{ data: T[], meta }` (list), `{ error: { code, message, correlationId } }` (error)
- **Auth**: Bearer token or session cookie; dev-mode bypass via `x-dev-user-id` header
- **RBAC**: `checkPermission()` at API boundary; 403 with reason on unauthorized
- **Audit**: automatic via `after()` for all mutations (create/update/delete)
- **Pagination**: offset-based `?page=1&pageSize=25` (max 200)
- **Filtering**: `?filter[field]=value&search[field]=term`
- **Feature flags**: `isFeatureEnabled('flag')` / `isApiEnabled('flag')`

## Deployment and Cost Constraints

- **Zero-cost MVP**: deployed on free tiers (Vercel Hobby + Neon Free)
- **Open-source first**: all dependencies are open-source
- **Production target**: Azure (preferred), Google Cloud (secondary), AWS (tertiary). Application code is cloud-agnostic.
- **Environment-only config**: switching providers requires only env var changes
