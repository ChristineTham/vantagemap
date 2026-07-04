# Plan: VantageMap V1 (MVP)

**Status: COMPLETE** — All 13 phases delivered. V1 MVP is feature-complete and deployed.

For post-MVP roadmap (Phases 14+), see [PLANV4.md](PLANV4.md).

---

Build VantageMap incrementally from backend to frontend as a LeanIX-inspired enterprise architecture platform. Each step is designed for AI-assisted vibe coding: self-contained, clearly scoped, and independently implementable. Steps within a phase can run in parallel unless an explicit dependency is noted.

### Execution Model

- **Vibe coding**: every step is scoped for a single AI coding session with clear inputs, outputs, and acceptance criteria.
- **Backend → frontend**: persistence and APIs are built before UI, so each frontend step has a stable API to consume.
- **Parallel by default**: steps within a phase have no implicit ordering. Dependencies are listed explicitly as `depends on: X.Y`.
- **Incremental delivery**: each step produces working, testable, deployable output. No step requires understanding the full system.
- **Instruction alignment**: steps that create or modify code must follow the conventions in [AGENTS.md](../AGENTS.md) and the `.github/instructions/` files.

---

### Phase 0 — Program Setup and Parity Baseline ✅

Build a requirements traceability matrix from the docs corpus into epics/capabilities with MVP vs Post-MVP tags. Define acceptance criteria and non-functional targets for v1 MVP. **Status: Complete.**

---

### Phase 1 — Tech Stack Research and Architecture Decisions ✅

Evaluate technology choices against the requirements in [docs/ARCHITECTURE.md](ARCHITECTURE.md), [docs/DEVELOPER.md](DEVELOPER.md), and [docs/MODEL.md](MODEL.md). Each step produces a short decision record (problem, options evaluated, decision, rationale) saved to `docs/adr/`. **Status: Complete — 8 ADRs produced.**

**Decisions summary:**

- Database: PostgreSQL 16 ([ADR-001](adr/001-database.md))
- ORM: Drizzle ORM ([ADR-002](adr/002-orm.md))
- Auth: Better Auth ([ADR-003](adr/003-authentication.md))
- API layer: Next.js Route Handlers / REST ([ADR-004](adr/004-api-layer.md))
- Async processing: Inngest ([ADR-005](adr/005-async-processing.md))
- Search: PostgreSQL Full-Text Search ([ADR-006](adr/006-search.md))
- Hosting: Vercel Hobby (MVP), Azure App Service (production) ([ADR-007](adr/007-hosting.md))
- Observability: Sentry + Pino + OpenTelemetry ([ADR-008](adr/008-observability.md))

| Step | Title                                 | Scope                                                                                                                                                                                                                                                                                                                                                                                                       | Depends on |
| ---- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1.1  | Database evaluation                   | Compare PostgreSQL, MySQL, CockroachDB, PlanetScale, and MongoDB against requirements: ACID transactions, JSONB for custom fields, relationship traversal, audit table performance, managed hosting options, cost at 100K documents / 500K relations (from [nfr.md](phase-0/nfr.md)). **Evaluate**: open-source status, free-tier hosted options (Neon, Supabase, PlanetScale Hobby), Azure managed path. | —          |
| 1.2  | ORM and migration tooling             | Compare Prisma, Drizzle ORM, Kysely, and TypeORM. Evaluate: type safety, migration workflow, JSON column support, raw query escape hatch, Next.js App Router compatibility.                                                                                                                                                                                                                                 | 1.1        |
| 1.3  | Authentication and session management | Compare NextAuth.js v5, Lucia, Clerk, Auth0, and custom JWT. Evaluate: OAuth 2.0 client credentials for technical users, SAML 2.0 SSO path, session strategy (JWT vs database), token lifecycle, Next.js 16 middleware compatibility. **Prefer**: open-source self-hosted (Auth.js, Lucia) over commercial SaaS (Clerk, Auth0) to ensure zero-cost MVP. Reference [UAM.md](UAM.md).                         | —          |
| 1.4  | API layer strategy                    | Compare Next.js Route Handlers (REST), tRPC, and GraphQL-first (Apollo/Yoga). Evaluate: type safety, OpenAPI generation, schema evolution, client code generation, compatibility with Server Components. Reference [DEVELOPER.md](DEVELOPER.md).                                                                                                                                                            | —          |
| 1.5  | Async job processing                  | Compare BullMQ + Redis, Inngest, Trigger.dev, and Vercel Cron/Queues. Evaluate: retry semantics, dead-letter handling, job observability, webhook delivery use case, managed vs self-hosted Redis. **Evaluate**: free-tier limits (Upstash Free for Redis, Inngest free tier), open-source status.                                                                                                          | —          |
| 1.6  | Search engine                         | Compare PostgreSQL full-text search, Meilisearch, Typesense, and managed Elasticsearch/OpenSearch. Evaluate: faceted search, cross-entity queries, index sync strategy, p95 <300 ms target, operational overhead.                                                                                                                                                                                           | 1.1        |
| 1.7  | Hosting and deployment                | Compare Vercel, Netlify, AWS Amplify, Railway, Fly.io, and self-hosted Docker. Evaluate: Next.js 16 support, managed database add-ons, preview deployments, edge vs serverless. **Key constraint**: MVP must deploy at zero cost on free tier. Evaluate free-tier limits (bandwidth, build minutes, function invocations). Document Azure App Service path for production.                                  | —          |
| 1.8  | Observability and monitoring          | Compare Vercel Analytics + Sentry, Datadog, Grafana Cloud, and OpenTelemetry Collector → self-hosted. Evaluate: distributed tracing, structured logging, error tracking, alerting. **Prefer**: free-tier options (Sentry Free, Grafana Cloud Free, Better Stack Free) over commercial (Datadog). Reference [nfr.md](phase-0/nfr.md).                                                                        | —          |
| 1.9  | Compile ADR documents                 | Write final architecture decision records from steps 1.1–1.8. Create `docs/adr/` directory with one ADR per decision. Update [AGENTS.md](../AGENTS.md) tech stack section and [ARCHITECTURE.md](ARCHITECTURE.md) if choices differ from preliminary recommendations.                                                                                                                                        | 1.1–1.8    |

---

### Phase 2 — Project Bootstrap ✅

Scaffold the project and establish the development baseline. All steps follow [AGENTS.md](../AGENTS.md) conventions (Next.js 16, TypeScript strict, Tailwind CSS v4, App Router only). **Status: Complete.**

**Decisions summary:**

- Framework: Next.js 16.2.6 with React 19, TypeScript strict, App Router, `src/` layout, `@/` alias
- Fonts: Noto Sans / Noto Serif / Noto Sans Mono via `next/font/google` (self-hosted, no external requests)
- Styling: Tailwind CSS v4 with `@import "tailwindcss"` + `@theme inline {}` — all 16 Rosely tokens registered; shadcn/ui wired via `components.json` and `src/lib/utils.ts` (`cn()`)
- Database: Drizzle ORM + `@neondatabase/serverless` HTTP driver; `drizzle.config.ts` targets `./drizzle` migrations; schema barrel at `src/db/schema/index.ts` (tables to be added in Phase 3)
- Linting: ESLint 9 with `eslint-config-next` core-web-vitals + TypeScript + `eslint-config-prettier`
- Formatting: Prettier 3 (100-char width, ES2015 trailing commas); `.prettierignore` excludes `node_modules`, `.next`, `drizzle`, `.agents`
- CI: GitHub Actions workflow at `.github/workflows/ci.yml` — type-check → lint → format → test → build on every push/PR; `SKIP_ENV_VALIDATION=true` for builds without a real database
- Environment: `src/env.ts` via `@t3-oss/env-nextjs` + Zod; validates `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`; `.env.example` documents all stubs
- Testing: Vitest 3 with `@vitejs/plugin-react` + `vite-tsconfig-paths`; smoke test in `src/__tests__/setup.test.ts`
- Package management: `.npmrc` sets `legacy-peer-deps=true` for better-auth Svelte peer conflict

| Step | Title                                                    | Scope                                                                                                                                                                                                                                                                                                                                                                             | Depends on |
| ---- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 2.1  | Initialize Next.js project                               | Create Next.js 16 project with TypeScript strict mode. Configure `tsconfig.json` path alias `@/` → `src/`. Add `.gitignore`, `package.json` scripts (`dev`, `build`, `lint`). Create placeholder `src/app/layout.tsx` and `src/app/page.tsx`.                                                                                                                                     | Phase 1    |
| 2.2  | Configure Tailwind CSS v4, Rosely palette, and shadcn/ui | Set up `src/app/globals.css` with `@import "tailwindcss"` and `@theme inline {}` block defining all 16 Rosely colour tokens as CSS variables and Tailwind utilities. Initialise shadcn/ui (Base UI variant) and map Rosely tokens to shadcn/ui CSS variables. Reference [DESIGN.md](../DESIGN.md) and [styling.instructions.md](../.github/instructions/styling.instructions.md). | 2.1        |
| 2.3  | Set up database and ORM                                  | Install Drizzle ORM and `drizzle-kit`, configure Neon PostgreSQL connection via environment variables, create initial empty schema in `src/db/schema/`, add migration scripts to `package.json`.                                                                                                                                                                                  | 2.1        |
| 2.4  | Linting, formatting, and CI                              | Configure ESLint (Next.js recommended rules + TypeScript strict), Prettier, and a GitHub Actions CI workflow for lint + build + type-check on every PR.                                                                                                                                                                                                                           | 2.1        |
| 2.5  | Environment and secrets configuration                    | Create `.env.example` with documented variable stubs (database URL, auth secret, API keys). Add validation using `zod` or `@t3-oss/env-nextjs` to fail fast on missing config.                                                                                                                                                                                                    | 2.1        |
| 2.6  | Testing framework                                        | Set up Vitest (or chosen test runner) for unit and integration tests. Add test scripts to `package.json`. Create a sample test to verify the pipeline works.                                                                                                                                                                                                                      | 2.1        |

---

### Phase 3 — Database Schema and Core Domain Models ✅

Implement the canonical data model from [MODEL.md](MODEL.md) as database tables with typed ORM models. Each step creates the tables, migration, and TypeScript types for one bounded context. **Status: Complete.**

**Decisions summary:**

- 31 tables across 12 schema files (`enums.ts`, `business.ts`, `applications.ts`, `strategy.ts`, `technology.ts`, `relationships.ts`, `tags.ts`, `governance.ts`, `audit.ts`, `users.ts`, `api-tokens.ts`, `webhooks.ts`)
- 27 PostgreSQL enums for all domain-specific value sets
- All tables use `uuid` primary keys, `created_at`/`updated_at` timestamps, `quality_seal` and `custom_fields jsonb` for governance
- Typed edge table (`relationships`) with 35-value `relationship_type` enum; indexed on source, target, and type
- `audit_entries` is append-only (no `updated_at`); 5 indexes for p95 &lt;1 s retrieval requirement from [nfr.md](phase-0/nfr.md)
- `subscriptions` and `tag_assignments` use unique constraints to prevent duplicates
- User/workspace tables are separate from Better Auth session tables (Better Auth adds its own tables in Phase 10)
- Seed script (`src/db/seed.ts`) is idempotent via `TRUNCATE … CASCADE`; populates all 31 tables
- Migration file generated at `drizzle/0000_wakeful_iron_patriot.sql`; schema pushed to Neon free-tier database

| Step | Title                                  | Scope                                                                                                                                                                                                                                                                                                    | Depends on |
| ---- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 3.1  | Business architecture entities         | Tables for `BusinessCapability` (hierarchical, with level/parent), `Organization` (with subtypes: Business Unit, Customer, Region, Legal Entity, Team), `BusinessContext` (with subtypes: Product, Journey, Process, Value Stream, ESG). Include lifecycle phase, health status, and description fields. | 2.3        |
| 3.2  | Application and data entities          | Tables for `Application` (with subtypes: Business Application, Microservice, AI Agent), `DataObject`, `Interface` (with subtypes: Logical, API, MCP). Include lifecycle, fit scores (technical/functional), business criticality, TIME classification.                                                   | 2.3        |
| 3.3  | Strategy and planning entities         | Tables for `StrategicObjective`, `Initiative` (with subtypes: Idea, Program, Project, Epic), `Platform`. Include KPI sub-entities linked to objectives.                                                                                                                                                  | 2.3        |
| 3.4  | Technology entities                    | Tables for `TechCategory`, `ITComponent`, `Provider`, optional `System`. Include ring/quadrant for radar placement, lifecycle, end-of-life dates.                                                                                                                                                        | 2.3        |
| 3.5  | Relationship and edge tables           | Generic typed edge table for entity-to-entity relationships (e.g., `application → capability`, `initiative → objective`, hierarchical parent-child). Include relationship type, direction, and metadata columns. Reference the full relationship matrix in [MODEL.md](MODEL.md).                         | 3.1–3.4    |
| 3.6  | Tags, subscriptions, and custom fields | Tables for `Tag` (with tag groups and modes), `Subscription` (role-based: Responsible, Accountable, Observer), and a JSONB custom fields column on each document table.                                                                                                                                | 3.1–3.4    |
| 3.7  | Audit log table                        | Immutable `AuditEntry` table: actor, action (create/update/delete), target entity type, target ID, timestamp, diff (JSONB), request context. Indexed for p95 <1 s retrieval per [nfr.md](phase-0/nfr.md).                                                                                                | 2.3        |
| 3.8  | User, role, and workspace tables       | Tables for `User` (status lifecycle: Active, Invited, Requested, Not Invited, Archived), `Role` (Viewer, Member, Admin, Custom), `Workspace`, `UserWorkspaceRole` join. Reference [UAM.md](UAM.md) and [security-rbac.md](phase-0/security-rbac.md).                                                     | 2.3        |
| 3.9  | Seed data and fixtures                 | Migration script that populates all tables with sample data equivalent to the static fixtures described in [data.instructions.md](../.github/instructions/data.instructions.md). Create dev-only seed command.                                                                                           | 3.1–3.8    |

---

### Phase 4 — Backend API Foundation ✅

Build shared API infrastructure that all entity endpoints will use. Each step is a reusable middleware or utility layer. **Status: Complete.**

**Decisions summary:**

- Response envelope: `{ data: T }` for singles, `{ data: T[], meta }` for lists, `{ error: { code, message, details?, correlationId } }` for errors
- Auth: pluggable `authenticate()` with dev-mode bypass (`x-dev-user-id` header); Bearer token and session cookie extraction ready for Better Auth in Phase 10
- RBAC: static permission matrix mapping operations to roles; `checkPermission()` returns 403 with reason
- Audit: fire-and-forget `writeAuditLog()` with diff computation; `writeFailedAuthLog()` for denied attempts
- Pagination: offset-based with `page`/`pageSize` params (max 200); filtering via `filter[field]=value` and `search[field]=value`
- Feature flags: environment-variable-backed `isFeatureEnabled()` / `isApiEnabled()` with typed flag definitions
- Health check: `GET /api/health` — no auth required

| Step | Title                                        | Scope                                                                                                                                                                                                                                     | Depends on |
| ---- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 4.1  | API route handler patterns                   | Create shared utilities for API route handlers: standard JSON response envelope, error formatting (4xx/5xx), input validation with Zod, and typed request/response helpers. Establish the file pattern `src/app/api/[resource]/route.ts`. | 2.1        |
| 4.2  | Authentication middleware                    | Implement session-based or JWT authentication middleware for API routes. Protect all `/api/*` routes by default. Support both user sessions and technical user bearer tokens. Reference [UAM.md](UAM.md).                                 | 3.8, 4.1   |
| 4.3  | RBAC permission middleware                   | Implement role-based permission checking at the API boundary. Map operations (view, create, edit, delete) to roles per [security-rbac.md](phase-0/security-rbac.md). Return 403 with reason on unauthorized access.                       | 4.2        |
| 4.4  | Audit logging middleware                     | Implement automatic audit entry creation for all mutation endpoints (POST, PUT, PATCH, DELETE). Capture actor, action, target, timestamp, and diff. Log failed authorization attempts.                                                    | 3.7, 4.2   |
| 4.5  | Pagination, sorting, and filtering utilities | Shared query helpers: cursor or offset pagination (required for >200 records per [nfr.md](phase-0/nfr.md)), sort-by-field, filter-by-field. Standard query parameter parsing.                                                             | 4.1        |
| 4.6  | Feature flag infrastructure                  | Simple feature flag system (environment variable or database-backed) to enable per-module rollback during migration per [migration-plan.md](phase-0/migration-plan.md).                                                                   | 4.1        |

---

### Phase 5 — Entity CRUD APIs ✅

One step per document type. All steps are independent and parallelizable. Each step creates the full REST endpoint suite (GET list, GET by ID, POST create, PATCH update, DELETE) with pagination, permission checks, audit logging, and tests. **Status: Complete. All 10 entity route handlers implemented using a shared CRUD factory (`src/lib/crud-factory.ts`). Type-check, lint, and build all pass. Smoke-tested in Codespaces (all 11 endpoints, query parameters, RBAC, and audit logging verified). See [phase-5-codespaces.md](phase-5-codespaces.md).**

| Step | Title                   | Entity                                                                                  | Depends on   |
| ---- | ----------------------- | --------------------------------------------------------------------------------------- | ------------ |
| 5.1  | Business Capability API | `BusinessCapability` — hierarchical listing by level/parent, CRUD with lifecycle fields | 3.1, 4.1–4.5 |
| 5.2  | Application API         | `Application` — CRUD with fit scores, criticality, TIME classification, lifecycle       | 3.2, 4.1–4.5 |
| 5.3  | Strategic Objective API | `StrategicObjective` — CRUD with KPI sub-resources and perspective grouping             | 3.3, 4.1–4.5 |
| 5.4  | Initiative API          | `Initiative` — CRUD with status workflow, date ranges, linked objectives                | 3.3, 4.1–4.5 |
| 5.5  | Tech Radar Entry API    | `ITComponent` / `TechCategory` — CRUD with ring, quadrant, lifecycle, provider linkage  | 3.4, 4.1–4.5 |
| 5.6  | Organization API        | `Organization` — hierarchical CRUD with subtypes                                        | 3.1, 4.1–4.5 |
| 5.7  | Data Object API         | `DataObject` — CRUD with application linkage                                            | 3.2, 4.1–4.5 |
| 5.8  | Interface API           | `Interface` — CRUD with provider/consumer direction, subtypes                           | 3.2, 4.1–4.5 |
| 5.9  | Provider API            | `Provider` — CRUD with linked IT components                                             | 3.4, 4.1–4.5 |
| 5.10 | Platform API            | `Platform` — CRUD with linked applications and objectives                               | 3.3, 4.1–4.5 |

---

### Phase 6 — Relationship and Search APIs ✅

Cross-entity operations that span multiple document types. **Status: Complete. Relationship CRUD with meta-model validation, cross-entity full-text search using PostgreSQL FTS, faceted filter API, and bulk operations (update/delete/upsert) all implemented. See [phase-6-codespaces.md](phase-6-codespaces.md).**

| Step | Title                   | Scope                                                                                                                                                                                         | Depends on                                               |
| ---- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 6.1  | Relationship CRUD API   | Create, read, update, delete typed relationships between any two documents. Validate relationship type against allowed pairs from [MODEL.md](MODEL.md). Support bulk relationship creation. | 3.5, 4.1–4.5                                             |
| 6.2  | Cross-entity search API | Full-text search across all document types. Return results grouped by type with highlighting. p95 <300 ms per [nfr.md](phase-0/nfr.md).                                                     | Phase 5 (any 2+ entity APIs), search engine from Phase 1 |
| 6.3  | Faceted filter API      | Filter documents by type, lifecycle phase, health status, tags, subscriptions, and custom field values. Support saved filter configurations.                                                | Phase 5 (any 2+ entity APIs)                             |
| 6.4  | Bulk operations API     | Bulk update (tags, lifecycle, fields) and bulk delete for selected documents. Idempotent upsert for import workflows. Audit log each affected entity.                                       | Phase 5 (any 2+ entity APIs), 4.4                        |

---

### Phase 7 — Frontend Shell and Shared Components ✅

Build the application shell and reusable UI component library before individual views. Follow [DESIGN.md](../DESIGN.md), [nextjs.instructions.md](../.github/instructions/nextjs.instructions.md), and [styling.instructions.md](../.github/instructions/styling.instructions.md). **Status: Complete. App layout with collapsible Sidebar, typed API client (`src/lib/api.ts`), unified data layer (`src/lib/data.ts`), shared components (DataTable, StatusBadge, HealthBadge, HealthIndicator, LifecycleTag, SearchInput, FilterBar, EmptyState, LoadingSpinner, Skeleton, Pagination), and error/loading/not-found pages all implemented. 339 tests passing. See [phase-7-codespaces.md](phase-7-codespaces.md).**

| Step | Title                      | Scope                                                                                                                                                                                                                                                                                                                                                      | Depends on                      |
| ---- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 7.1  | App layout and Sidebar     | Create `src/app/layout.tsx` with `<Sidebar />` + `<main>` wrapper. Build `src/components/Sidebar.tsx` as a Client Component with navigation for all six routes, active state via `usePathname`. Install and configure Lucide React icons.                                                                                                                  | 2.1, 2.2                        |
| 7.2  | API client and data layer  | Create `src/lib/api.ts` with typed fetch wrappers for all entity APIs. Create `src/lib/data.ts` with TypeScript types matching the database models. Support feature-flag toggle between static fixtures and API calls per [migration-plan.md](phase-0/migration-plan.md).                                                                                  | 4.1, Phase 5 (at least one API) |
| 7.3  | Shared UI components       | Install shadcn/ui components (Card, Table, Dialog, Tabs, Badge, Button, Input) into `src/components/ui/`. Build app-specific composed components in `src/components/`: DataTable, StatusBadge, HealthIndicator, LifecycleTag, SearchInput, FilterBar, EmptyState, LoadingSpinner, Pagination. All themed with Rosely tokens per [DESIGN.md](../DESIGN.md). | 2.2                             |
| 7.4  | Error and loading patterns | Create error boundary components, loading skeletons (`loading.tsx`), and `not-found.tsx` pages. Implement global error handling for API failures.                                                                                                                                                                                                          | 7.1                             |

---

### Phase 8 — Frontend Views ✅

One step per route/view. All steps are independent and parallelizable. Each step creates a Server Component page that fetches data from the API layer (via `src/lib/api.ts` or `src/lib/data.ts`) and renders it with shared components. Follow the [add-page skill](../.github/skills/add-page/SKILL.md) checklist. **Status: Complete. All six views implemented as Next.js 16 Server Components with Client Component sub-views for interactivity. Dashboard with Recharts charts, hierarchical Capability Map, filterable Application Portfolio, Balanced Scorecard Strategy Map, quadrant/ring Technology Radar, and CSS Gantt Strategic Roadmap. 394 tests passing. Type-check, lint, format, and build all pass. See [phase-8-codespaces.md](phase-8-codespaces.md).**

| Step | Title                   | Route                                                                                                                                                   | Depends on        |
| ---- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 8.1  | Dashboard page          | `/` — summary cards (counts, health distribution, recent changes), charts via Recharts, quick links to other views                                      | 7.1–7.4, 5.1, 5.2 |
| 8.2  | Business Capability Map | `/capabilities` — hierarchical capability tree with level-based grouping, health indicators, linked application counts, drill-down                      | 7.1–7.4, 5.1      |
| 8.3  | Application Portfolio   | `/applications` — filterable table/grid of applications with fit scores, lifecycle, criticality, TIME classification, health status                     | 7.1–7.4, 5.2      |
| 8.4  | Strategy Map            | `/strategy` — Balanced Scorecard layout grouping objectives by perspective (Financial, Customer, Internal, Learning), linked KPIs and initiatives       | 7.1–7.4, 5.3, 5.4 |
| 8.5  | Technology Radar        | `/radar` — radar visualization with quadrants (Languages, Frameworks, Tools, Platforms) and rings (Adopt, Trial, Assess, Hold), interactive hover/click | 7.1–7.4, 5.5      |
| 8.6  | Strategic Roadmap       | `/roadmap` — Gantt-style timeline of initiatives with status indicators, date ranges, milestone markers, objective linkage                              | 7.1–7.4, 5.4      |

---

### Phase 9 — CRUD and Editing UI ✅

Add create, edit, and detail views to support data stewardship workflows from [USER-GUIDE.md](USER-GUIDE.md). **Status: Complete. Universal document detail view (`/[type]/[id]`), create form (`/[type]/new`), edit dialog, delete dialog, relationship editor, bulk edit UI, search page with cross-entity search, and sidebar Search nav item. TypeScript clean, lint clean, build passes. 93 new tests (487 total). See [phase-9-codespaces.md](phase-9-codespaces.md).**

| Step | Title                  | Scope                                                                                                                                                   | Depends on               |
| ---- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 9.1  | Document detail view | Universal detail page pattern (`/[type]/[id]`) showing all fields, lifecycle, subscriptions, tags, relationships, and audit history for any document. | Phase 8 (any view)       |
| 9.2  | Create document form | Modal or page-based create flow with field validation, type selection, and initial relationship attachment. Client Component with `"use client"`.       | 9.1, relevant entity API |
| 9.3  | Edit document form   | Inline or modal editing of document fields with optimistic UI, validation, audit diff preview.                                                        | 9.1                      |
| 9.4  | Relationship editor    | Add/remove/edit relationships from a document detail view. Autocomplete search for target entity. Visual relationship diagram (optional).             | 9.1, 6.1                 |
| 9.5  | Bulk edit UI           | Multi-select documents from list views, apply bulk tag/lifecycle/field updates. Confirmation dialog with affected entity count.                       | Phase 8 (any view), 6.4  |
| 9.6  | Search and filter UI   | Global search bar in Sidebar or header. Advanced filter panel with facets. Saved search configurations. Results page.                                   | 6.2, 6.3                 |

---

### Phase 10 — User Management ✅

Implement user lifecycle and administration workflows from [UAM.md](UAM.md) and [ADMIN.md](ADMIN.md). **Status: Complete. Better Auth integrated with email/password auth, session management, password reset. Route-level middleware protects authenticated pages. Login, register, forgot-password, and reset-password pages. User profile with password change and notification preferences. Admin pages for user management (invite, role assignment, archive), API token management (create, revoke, expiry), and role/permissions matrix. See [phase-10-codespaces.md](phase-10-codespaces.md).**

| Step | Title                              | Scope                                                                                                                               | Depends on |
| ---- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 10.1 | User registration and login        | Sign-up, email/password login, session management, password reset. Protected route middleware.                                      | 4.2        |
| 10.2 | User profile and settings          | Profile page with name, email, avatar, notification preferences. Password change.                                                   | 10.1       |
| 10.3 | User administration                | Admin-only UI for listing users, inviting by email, changing roles, archiving users. User status lifecycle (Active → Archived).     | 10.1, 4.3  |
| 10.4 | Technical user management          | Admin UI for creating technical users, generating API tokens, setting token expiry, revoking tokens. Tokens shown once at creation. | 10.3       |
| 10.5 | Role assignment and permissions UI | Admin UI for assigning standard roles (Viewer, Member, Admin) to users. Display effective permissions matrix.                       | 10.3, 4.3  |

---

### Phase 11 — Governance and Data Quality ✅

Implement governance controls from [ADMIN.md](ADMIN.md) and [USER-GUIDE.md](USER-GUIDE.md). **Status: Complete — Schema, APIs, UI components, state machine, and tests implemented.**

| Step | Title                            | Scope                                                                                                                                                                      | Depends on                                   |
| ---- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 11.1 | Tagging system                   | Tag groups with configurable modes (on-the-fly, hybrid, predefined-only). Tag CRUD API and UI for applying tags to documents.                                            | Phase 5 (any entity API), Phase 8 (any view) |
| 11.2 | Subscription and ownership model | Subscription roles (Responsible, Accountable, Observer) per document. Subscribe/unsubscribe API and UI. Notification triggers on subscribed entity changes.              | Phase 5, 9.1                                 |
| 11.3 | Quality seal workflow            | Quality seal states (Draft, Check Needed, Approved, Rejected) per document. State transition rules based on subscriber role. Configurable renewal intervals. API and UI. | 11.2, 9.1                                    |
| 11.4 | Comments and collaboration       | Comments on documents with threaded replies. Mention other users. Comment notification.                                                                                  | 9.1, 10.1                                    |
| 11.5 | To-do and task tracking          | To-do items linked to documents. Assign to users. Status tracking (open/done).                                                                                           | 9.1, 10.1                                    |
| 11.6 | Survey framework                 | Create surveys to collect data from stakeholders. Link survey questions to document fields. Response collection and merge workflow.                                      | 10.1, Phase 5                                |

---

### Phase 12 — Integration Surface ✅

Build external integration capabilities from [DEVELOPER.md](DEVELOPER.md). **Status: Complete. OpenAPI 3.1 spec with interactive Scalar API explorer at `/api/docs`, GraphQL query endpoint with all 12 document types + relationship traversal + depth limiting, webhook subscription CRUD with HMAC-signed delivery and exponential-backoff retry engine, CSV import with preview/execute modes and column auto-mapping, CSV export with field selection and filtering. Four new feature flags added. See [phase-12-codespaces.md](phase-12-codespaces.md).**

| Step | Title                  | Scope                                                                                                                                                                                        | Depends on   |
| ---- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 12.1 | OpenAPI documentation  | Auto-generate OpenAPI 3.1 specification from route handlers. Serve interactive API explorer at `/api/docs`. Publish as static YAML for CI validation.                                        | Phase 5      |
| 12.2 | GraphQL endpoint       | GraphQL API for document queries with relationship traversal, field selection, and pagination. Schema generated from database models. Complexity limits enforced.                          | Phase 5, 6.1 |
| 12.3 | Webhook infrastructure | Webhook subscription CRUD API. Event catalog (document created/updated/deleted, relationship changed). PUSH delivery with retry and exponential backoff. Dead-letter queue. Delivery logs. | Phase 5, 4.4 |
| 12.4 | CSV/Excel import       | Upload CSV or Excel file, map columns to document fields, preview changes, confirm import. Idempotent upsert by external ID or name. Error report for failed rows.                         | Phase 5, 6.4 |
| 12.5 | CSV/Excel export       | Export filtered document lists and relationship data to CSV or Excel. Include all fields and custom fields. Streaming download for large datasets.                                         | Phase 5, 6.3 |

---

### Phase 13 — Reporting and Analytics ✅

Implement use-case engines and analytics from [USE-CASES.md](USE-CASES.md). **Status: Complete. On-demand reporting pipeline with portfolio health scoring (0-100 composite), TIME rationalization engine with fit-score-based recommendation system, 6R cloud migration distribution, obsolescence risk tracking with configurable horizon and severity levels, and capability-to-application coverage analysis. Five report API endpoints under `/api/reports/*`. Dedicated `/reports` page and dashboard widget integration with Recharts visualizations. Sidebar updated. See [phase-13-codespaces.md](phase-13-codespaces.md).**

| Step | Title                              | Scope                                                                                                                                                     | Depends on                         |
| ---- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 13.1 | Reporting data pipeline            | Reporting runtime: pre-computed or on-demand aggregation of document data for dashboard and report consumption. Cache layer for expensive queries.      | Phase 5, Recharts (from AGENTS.md) |
| 13.2 | Application rationalization (TIME) | TIME model (Tolerate/Invest/Migrate/Eliminate) classification engine. Dashboard widget showing distribution. Drill-down to application list per category. | 5.2, 8.3                           |
| 13.3 | Cloud migration strategy (6R)      | 6R classification (Rehost/Replatform/Rearchitect/Repurchase/Retain/Retire) per application. Dashboard widget and portfolio view overlay.                  | 5.2, 8.3                           |
| 13.4 | Lifecycle and obsolescence risk    | Identify applications and IT components approaching end-of-life. Risk score calculation. Alert dashboard for items within configurable time horizon.      | 5.2, 5.5, 8.1                      |
| 13.5 | Roadmap impact analysis            | Show which capabilities and applications are affected by each initiative. Impact matrix view. Gap analysis (capabilities without planned initiatives).    | 5.1, 5.4, 6.1                      |
| 13.6 | Data quality metrics               | Quality completeness scores per document type (% fields filled, % relationships defined, % subscriptions assigned). Dashboard widget and trend chart.   | Phase 5, 11.3                      |
| 13.7 | Adoption metrics                   | User activity tracking: logins, edits, searches. Adoption dashboard for admins. Reference [ADMIN.md](ADMIN.md) adoption KPIs.                             | 10.1, 3.7                          |

---

### Cross-Cutting Concerns (Continuous)

These activities run alongside all phases and should be addressed incrementally as each step is implemented.

| Concern             | Scope                                                                                                                                                                      | Reference                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Observability       | Structured JSON logging, distributed tracing (OpenTelemetry), error tracking, alerting on latency/error thresholds                                                         | [nfr.md](phase-0/nfr.md)                                                     |
| Performance         | API p95 <250 ms (read), <400 ms (write). Pagination for >200 records. Query budgets. Cache strategy for hot paths.                                                         | [nfr.md](phase-0/nfr.md)                                                     |
| Security            | Secret management via environment variables (never in code). Input validation on all endpoints. CSRF protection. Rate limiting. Dependency vulnerability scanning.         | [security-rbac.md](phase-0/security-rbac.md)                                 |
| Reliability         | 99.5% availability target. Idempotent writes. Backup/restore procedures (24 h RPO, 4 h RTO). Migration safety gates.                                                       | [nfr.md](phase-0/nfr.md)                                                     |
| Instruction updates | Update `.github/instructions/` and `.github/skills/` files as new patterns are established. Each phase should leave instructions accurate for the next phase.              | [AGENTS.md](../AGENTS.md)                                                    |
| Testing             | Unit tests for utilities and domain logic. Integration tests for API endpoints. End-to-end tests for critical user flows. Target: every step includes tests for its scope. | [acceptance-criteria-templates.md](phase-0/acceptance-criteria-templates.md) |

---

### Dependency Graph Summary

```
Phase 0 ✅ (Requirements)
  └→ Phase 1 ✅ (Tech Stack Research)
       └→ Phase 2 ✅ (Project Bootstrap)
            ├→ Phase 3 ✅ (Database Schema)
            │    └→ Phase 4 ✅ (API Foundation)
            │         └→ Phase 5 ✅ (Entity APIs)
            │              ├→ Phase 6 ✅ (Relationships & Search)
            │              ├→ Phase 12 ✅ (Integrations)
            │              └→ Phase 13 ✅ (Reporting)
            └→ Phase 7 ✅ (Frontend Shell)
                 └→ Phase 8 ✅ (Frontend Views)
                      └→ Phase 9 ✅ (CRUD UI)

Phase 4.2 → Phase 10 ✅ (User Management)
Phase 5 + 8 → Phase 11 ✅ (Governance)
```

All V1 phases complete. For V2 roadmap (Phases 14–17), see [PLANV4.md](PLANV4.md).

---

### Relevant Files

| File                                                            | Role in Plan                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [AGENTS.md](../AGENTS.md)                                       | Tech stack constraints, architecture conventions, all steps must comply      |
| [docs/ARCHITECTURE.md](ARCHITECTURE.md)                         | Target architecture; preliminary tech recommendations for Phase 1 evaluation |
| [docs/MODEL.md](MODEL.md)                                       | Canonical meta model driving Phase 3 schema and Phase 5 APIs                 |
| [docs/UAM.md](UAM.md)                                           | Identity/access requirements for Phase 4, 10, 14                             |
| [docs/ADMIN.md](ADMIN.md)                                       | Governance and admin features for Phase 10, 11                               |
| [docs/USER-GUIDE.md](USER-GUIDE.md)                             | End-user workflow parity requirements for Phase 8, 9                         |
| [docs/DEVELOPER.md](DEVELOPER.md)                               | API/integration requirements for Phase 12                                    |
| [docs/USE-CASES.md](USE-CASES.md)                               | Use-case engines and methodology for Phase 13                                |
| [docs/GETTING-STARTED.md](GETTING-STARTED.md)                   | Onboarding and adoption sequencing context                                   |
| [docs/phase-0/](phase-0/README.md)                              | Phase 0 artifacts: traceability matrix, epics, NFRs, gates, sprint plan      |
| [docs/openapi-templates/](openapi-templates/)                   | API contract skeletons for Phase 5 and 12 implementation                     |
| [.github/instructions/](../.github/instructions/)               | Coding conventions enforced during implementation                            |
| [.github/skills/add-page/](../.github/skills/add-page/SKILL.md) | Page creation workflow for Phase 8 steps                                     |

---

### Decisions

| Decision              | Choice                                                                               | Rationale                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Delivery strategy     | Incremental, backend-first                                                           | Each step produces working output; backend APIs stabilize before frontend consumes them               |
| Implementation mode   | Vibe coding (AI agent per step)                                                      | Steps are self-contained with clear scope, inputs, outputs, and acceptance criteria                   |
| Tech stack            | Decided in Phase 1; see `docs/adr/`                                                  | PostgreSQL 16, Drizzle ORM, Better Auth, REST route handlers, Inngest, PG FTS, Sentry+Pino            |
| Frontend framework    | Next.js 16 App Router (confirmed in AGENTS.md)                                       | Already chosen and documented; not re-evaluated                                                       |
| Styling               | Tailwind CSS v4 + Rosely palette + shadcn/ui Base UI (see [DESIGN.md](../DESIGN.md)) | Already chosen and documented; not re-evaluated                                                       |
| API strategy          | REST-first (MVP), GraphQL added in Phase 12                                          | REST is simpler for vibe-coding agents; GraphQL deferred until schema is stable                       |
| Custom fields         | JSONB columns with validation                                                        | Avoids per-customer schema migrations; flexible for early product-market fit                          |
| MVP boundary          | Phases 0–13 are V1 MVP; Phases 14+ moved to [PLANV4.md](PLANV4.md)                   | Core platform complete before enterprise SSO and advanced features                                    |
| MVP deployment cost   | Zero monetary cost using free tiers                                                  | MVP must deploy without budget approval; validates product-market fit before spending                 |
| Technology preference | Open-source first at every layer                                                     | Avoid vendor lock-in; commercial services only when free tier exists and no OSS alternative is viable |
| Production hosting    | Azure preferred, GCP second, AWS third                                               | Enterprise alignment; application code is cloud-agnostic, only configuration differs                  |

---

### Verification Gates

These gates from [docs/phase-0/gates.md](phase-0/gates.md) apply at phase boundaries:

1. **Requirements Traceability** — every capability family from docs mapped to a step and tagged MVP or Post-MVP ✅
2. **Architecture Review** — tech stack decisions documented in ADRs before Phase 2 begins (Gate at end of Phase 1)
3. **MVP Scope** — persistent data model, RBAC, six views, CRUD, search, reporting, REST/GraphQL/webhooks included (Gate at end of Phase 12)
4. **Technical Readiness** — feature-flag migration from static fixtures to API-backed data with no broken routes (Gate during Phase 7.2)
5. **Instruction Governance** — instruction files updated to reflect architecture decisions and domain rules (Continuous; checked at each phase boundary)
6. **Non-Functional Readiness** — NFR targets from [nfr.md](phase-0/nfr.md) validated via load test before MVP release (Gate at end of Phase 13)

---

## Phase 0 Execution Status ✅

Phase 0 implementation has started with baseline planning artifacts and governance instructions. **Status: Complete.**

### Created Artifacts

- [docs/phase-0/README.md](phase-0/README.md)
- [docs/phase-0/traceability-matrix.csv](phase-0/traceability-matrix.csv)
- [docs/phase-0/epic-catalog.md](phase-0/epic-catalog.md)
- [docs/phase-0/nfr.md](phase-0/nfr.md)
- [docs/phase-0/acceptance-criteria-templates.md](phase-0/acceptance-criteria-templates.md)
- [docs/phase-0/migration-plan.md](phase-0/migration-plan.md)
- [docs/phase-0/security-rbac.md](phase-0/security-rbac.md)
- [docs/phase-0/gates.md](phase-0/gates.md)
- [.github/instructions/requirements.instructions.md](../.github/instructions/requirements.instructions.md)

---

## Phase 2 Execution Status ✅

Project bootstrap scaffolded and all pipelines verified green. **Status: Complete.**

### Created / Modified Files

| File                              | Purpose                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `package.json`                    | All runtime and dev dependencies; `dev`, `build`, `lint`, `format`, `type-check`, `db:*`, `test` scripts      |
| `tsconfig.json`                   | TypeScript strict mode; `@/` → `src/` path alias                                                              |
| `next.config.ts`                  | Next.js 16 config                                                                                             |
| `postcss.config.mjs`              | `@tailwindcss/postcss` plugin                                                                                 |
| `eslint.config.mjs`               | ESLint 9 with core-web-vitals + TypeScript + prettier conflict disable                                        |
| `.prettierrc` / `.prettierignore` | Prettier 3; 100-char width; ignores `.agents/`, `drizzle/`, generated files                                   |
| `.npmrc`                          | `legacy-peer-deps=true` (resolves better-auth Svelte peer conflict)                                           |
| `.env.example`                    | Documented stubs for `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`                                  |
| `.vscode/extensions.json`         | Recommended VS Code extensions for the project                                                                |
| `components.json`                 | shadcn/ui config pointing at `src/app/globals.css` and `@/components/ui`                                      |
| `drizzle.config.ts`               | Drizzle Kit config; dialect `postgresql`; migrations output `./drizzle/`                                      |
| `vitest.config.ts`                | Vitest 3 with React plugin and tsconfig paths                                                                 |
| `src/app/globals.css`             | Tailwind v4 `@import` + all 16 Rosely CSS variables + `@theme inline {}` tokens + shadcn/ui semantic mappings |
| `src/app/layout.tsx`              | Root layout with Noto Sans / Noto Serif / Noto Sans Mono fonts via `next/font/google`                         |
| `src/app/page.tsx`                | Placeholder home page (full Dashboard implemented in Phase 8)                                                 |
| `src/env.ts`                      | `@t3-oss/env-nextjs` + Zod env validation; `SKIP_ENV_VALIDATION` flag for CI                                  |
| `src/lib/utils.ts`                | `cn()` helper (clsx + tailwind-merge) for shadcn/ui                                                           |
| `src/db/index.ts`                 | Neon serverless HTTP driver + `drizzle()` export                                                              |
| `src/db/schema/index.ts`          | Barrel for Phase 3 entity table modules                                                                       |
| `src/__tests__/setup.test.ts`     | Smoke test verifying Vitest pipeline                                                                          |
| `.github/workflows/ci.yml`        | GitHub Actions CI: type-check → lint → format → test → build                                                  |

### Pipeline Verification (all green)

```
npm run type-check   ✓
npm run lint         ✓
npm run format:check ✓
npm test             ✓  (2 tests passed)
npm run build        ✓  (Next.js 16.2.6)
```

---

## Phase 3 Execution Status ✅

Database schema scaffolded, migration generated, pushed to Neon, and seed data loaded. **Status: Complete.**

### Created / Modified Files

| File                                    | Step    | Description                                                                                                                                     |
| --------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/schema/enums.ts`                | 3.1–3.8 | 27 PostgreSQL enums shared across all bounded contexts                                                                                          |
| `src/db/schema/business.ts`             | 3.1     | `business_capabilities` (hierarchical), `organizations`, `business_contexts`                                                                    |
| `src/db/schema/applications.ts`         | 3.2     | `applications`, `data_objects`, `interfaces`                                                                                                    |
| `src/db/schema/strategy.ts`             | 3.3     | `strategic_objectives`, `kpis`, `initiatives`, `platforms`                                                                                      |
| `src/db/schema/technology.ts`           | 3.4     | `tech_categories`, `it_components`, `providers`                                                                                                 |
| `src/db/schema/relationships.ts`        | 3.5     | `relationships` — generic typed edge table with 3 indexes                                                                                       |
| `src/db/schema/tags.ts`                 | 3.6     | `tag_groups`, `tags`, `tag_assignments`, `subscriptions` with unique constraints                                                                |
| `src/db/schema/audit.ts`                | 3.7     | `audit_entries` — append-only with 5 indexes for fast retrieval                                                                                 |
| `src/db/schema/users.ts`                | 3.8     | `users`, `workspaces`, `user_workspace_roles` with FK cascade                                                                                   |
| `src/db/schema/index.ts`                | 3.1–3.8 | Barrel re-exporting all schema modules                                                                                                          |
| `src/db/seed.ts`                        | 3.9     | Idempotent seed: 2 users, 19 capabilities, 10 apps, 6 objectives, 8 KPIs, 6 initiatives, 12 IT components, 7 tags, relationships, audit entries |
| `drizzle/0000_wakeful_iron_patriot.sql` | 3.1–3.8 | Generated SQL migration (initial tables, all enums, indexes, FKs; the schema has since grown to 31 tables across later phases)                   |

### Pipeline Verification (all green)

```
npm run type-check   ✓
npm run lint         ✓
npm run format:check ✓
npm test             ✓  (2 tests passed)
npm run build        ✓  (Next.js 16.2.6)
npm run db:generate  ✓  (22 tables, migration file generated)
npm run db:migrate   ✓  (schema applied to Neon database)
npm run db:seed      ✓  (all 17 data sections seeded)
```

### Neon Database

| Field     | Value                                                         |
| --------- | ------------------------------------------------------------- |
| Claim URL | <https://neon.new/claim/019e1ae7-0ba4-7175-8692-14841e3d3485> |
| Expires   | 2026-05-15T06:36:50Z (72 hours; permanent once claimed)       |
| Endpoint  | `ep-sweet-…c-3.us-east-2.aws.neon.tech`                       |
| Region    | US East 2 (AWS)                                               |

**Claim steps:**

1. Open <https://neon.new/claim/019e1ae7-0ba4-7175-8692-14841e3d3485> in a browser.
2. Sign in with GitHub, Google, or email — no credit card required.
3. The database transfers to your Neon account and never expires.
4. In the Neon console, note the **Connection string** for your project.
5. Update `.env.local`: replace `DATABASE_URL` with the string from the Neon console.
6. Run `npm run db:seed` to re-populate the new permanent database.

**If the claim link has expired (>72 h):**

1. Create a free project at <https://console.neon.tech>.
2. Copy the connection string into `.env.local` as `DATABASE_URL`.
3. Run `npm run db:migrate` then `npm run db:seed`.

### Next Step

Begin **Phase 4 — Backend API Foundation**, starting with steps 4.1 and 4.5 (independent utilities), then 4.2 (auth middleware, depends on 3.8), then 4.3–4.4 (RBAC and audit, depend on 4.2), then 4.6 (feature flags).
