# MVP Execution Plan (Phase-Sequenced)

This plan maps the PLAN.md phases to an execution sequence optimized for vibe coding — each step is a self-contained AI coding session.

## Execution Model

- **Implementation mode**: vibe coding (one AI agent per step)
- **Parallelism**: steps within a phase run in parallel unless an explicit dependency is noted
- **Sequencing**: phases are sequential unless parallel tracks are specified
- **Scope**: MVP phases only (Phases 1–13); Post-MVP (14–15) deferred

## Track Overview

After Phase 2 (Project Bootstrap), three parallel tracks are available:

| Track              | Phases        | Focus                                                                        |
| ------------------ | ------------- | ---------------------------------------------------------------------------- |
| A (Backend)        | 3 → 4 → 5 → 6 | Database schema, API foundation, entity CRUD, relationships/search           |
| B (Frontend)       | 7 → 8         | Shell, shared components, six core views (can use static fixtures initially) |
| C (Infrastructure) | 2.4, 2.6      | CI, linting, testing framework (independent)                                 |

Tracks A and B converge at Phase 9 (CRUD UI) which requires both APIs and frontend shell.

## Phase Execution Sequence

### Phase 1 — Tech Stack Research (9 steps, all parallel except 1.9)

| Step | Title                        | Parallel      | Output                                   |
| ---- | ---------------------------- | ------------- | ---------------------------------------- |
| 1.1  | Database evaluation          | Yes           | ADR draft                                |
| 1.2  | ORM and migration tooling    | After 1.1     | ADR draft                                |
| 1.3  | Authentication and sessions  | Yes           | ADR draft                                |
| 1.4  | API layer strategy           | Yes           | ADR draft                                |
| 1.5  | Async job processing         | Yes           | ADR draft                                |
| 1.6  | Search engine                | After 1.1     | ADR draft                                |
| 1.7  | Hosting and deployment       | Yes           | ADR draft                                |
| 1.8  | Observability and monitoring | Yes           | ADR draft                                |
| 1.9  | Compile ADR documents        | After 1.1–1.8 | `docs/adr/` directory, updated AGENTS.md |

Gate: all ADRs reviewed and finalized before Phase 2 begins.

### Phase 2 — Project Bootstrap (6 steps, mostly parallel after 2.1)

| Step | Title                                | Parallel  | Output                                   |
| ---- | ------------------------------------ | --------- | ---------------------------------------- |
| 2.1  | Initialize Next.js project           | First     | Project scaffold, tsconfig, package.json |
| 2.2  | Configure Tailwind CSS v4 and Rosely | After 2.1 | globals.css with Rosely tokens           |
| 2.3  | Set up database and ORM              | After 2.1 | Schema file, migration scripts           |
| 2.4  | Linting, formatting, and CI          | After 2.1 | ESLint config, GitHub Actions workflow   |
| 2.5  | Environment and secrets config       | After 2.1 | .env.example, env validation             |
| 2.6  | Testing framework                    | After 2.1 | Test runner config, sample test          |

Gate: `npm run build` and `npm run lint` pass; CI pipeline green.

### Phase 3 — Database Schema (9 steps, 3.1–3.4 parallel, then 3.5–3.9)

| Step | Title                              | Parallel      | Output                                                       |
| ---- | ---------------------------------- | ------------- | ------------------------------------------------------------ |
| 3.1  | Business architecture entities     | After 2.3     | Tables + types for Capability, Organization, BusinessContext |
| 3.2  | Application and data entities      | After 2.3     | Tables + types for Application, DataObject, Interface        |
| 3.3  | Strategy and planning entities     | After 2.3     | Tables + types for Objective, Initiative, Platform           |
| 3.4  | Technology entities                | After 2.3     | Tables + types for TechCategory, ITComponent, Provider       |
| 3.5  | Relationship edge tables           | After 3.1–3.4 | Generic edge table for all entity relationships              |
| 3.6  | Tags, subscriptions, custom fields | After 3.1–3.4 | Tag, Subscription tables; JSONB custom field columns         |
| 3.7  | Audit log table                    | After 2.3     | Immutable AuditEntry table with indexes                      |
| 3.8  | User, role, workspace tables       | After 2.3     | User, Role, Workspace, UserWorkspaceRole tables              |
| 3.9  | Seed data and fixtures             | After 3.1–3.8 | Dev seed script with sample data                             |

Gate: all migrations run cleanly; seed data populates without errors.

### Phase 4 — Backend API Foundation (6 steps, sequential)

| Step | Title                          | Parallel       | Output                                                     |
| ---- | ------------------------------ | -------------- | ---------------------------------------------------------- |
| 4.1  | API route handler patterns     | After 2.1      | Shared response envelope, Zod validation, error formatting |
| 4.2  | Authentication middleware      | After 3.8, 4.1 | Session/JWT auth for all API routes                        |
| 4.3  | RBAC permission middleware     | After 4.2      | Role-based checks returning 403 on unauthorized            |
| 4.4  | Audit logging middleware       | After 3.7, 4.2 | Auto audit entries for POST/PUT/PATCH/DELETE               |
| 4.5  | Pagination, sorting, filtering | After 4.1      | Shared query helpers for cursor/offset pagination          |
| 4.6  | Feature flag infrastructure    | After 4.1      | Per-module toggle for static vs API data                   |

Gate: middleware stack works end-to-end on a test endpoint.

### Phase 5 — Entity CRUD APIs (10 steps, ALL parallel)

| Step | Title                   | Entity                    |
| ---- | ----------------------- | ------------------------- |
| 5.1  | Business Capability API | BusinessCapability        |
| 5.2  | Application API         | Application               |
| 5.3  | Strategic Objective API | StrategicObjective        |
| 5.4  | Initiative API          | Initiative                |
| 5.5  | Tech Radar Entry API    | ITComponent, TechCategory |
| 5.6  | Organization API        | Organization              |
| 5.7  | Data Object API         | DataObject                |
| 5.8  | Interface API           | Interface                 |
| 5.9  | Provider API            | Provider                  |
| 5.10 | Platform API            | Platform                  |

All depend on: 3.x (schema for that entity) + 4.1–4.5 (API foundation).
Gate: each API passes CRUD + permission + audit integration tests.

### Phase 6 — Relationship and Search APIs (4 steps)

| Step | Title                   | Parallel           | Output                                   |
| ---- | ----------------------- | ------------------ | ---------------------------------------- |
| 6.1  | Relationship CRUD API   | After 3.5, Phase 5 | Typed relationship management            |
| 6.2  | Cross-entity search API | After Phase 5 (2+) | Full-text search, p95 <300 ms            |
| 6.3  | Faceted filter API      | After Phase 5 (2+) | Multi-facet filtering with saved configs |
| 6.4  | Bulk operations API     | After Phase 5 (2+) | Bulk update/delete with audit            |

### Phase 7 — Frontend Shell (4 steps)

Can start in parallel with Phases 3–5 using static fixtures.

| Step | Title                      | Parallel       | Output                                     |
| ---- | -------------------------- | -------------- | ------------------------------------------ |
| 7.1  | App layout and Sidebar     | After 2.1, 2.2 | Layout wrapper + Sidebar navigation        |
| 7.2  | API client and data layer  | After 4.1      | Typed fetch wrappers + feature-flag toggle |
| 7.3  | Shared UI components       | After 2.2      | Card, DataTable, StatusBadge, etc.         |
| 7.4  | Error and loading patterns | After 7.1      | error.tsx, loading.tsx, not-found.tsx      |

### Phase 8 — Frontend Views (6 steps, ALL parallel)

| Step | Title                   | Route           |
| ---- | ----------------------- | --------------- |
| 8.1  | Dashboard               | `/`             |
| 8.2  | Business Capability Map | `/capabilities` |
| 8.3  | Application Portfolio   | `/applications` |
| 8.4  | Strategy Map            | `/strategy`     |
| 8.5  | Technology Radar        | `/radar`        |
| 8.6  | Strategic Roadmap       | `/roadmap`      |

All depend on: 7.1–7.4 + corresponding entity API from Phase 5.

### Phase 9 — CRUD and Editing UI (6 steps)

Requires both frontend shell and entity APIs.

| Step | Title                  | Depends on         |
| ---- | ---------------------- | ------------------ |
| 9.1  | Document detail view | Phase 8 (any view) |
| 9.2  | Create document form | 9.1                |
| 9.3  | Edit document form   | 9.1                |
| 9.4  | Relationship editor    | 9.1, 6.1           |
| 9.5  | Bulk edit UI           | Phase 8, 6.4       |
| 9.6  | Search and filter UI   | 6.2, 6.3           |

### Phase 10 — User Management (5 steps, sequential)

| Step | Title                       | Depends on |
| ---- | --------------------------- | ---------- |
| 10.1 | User registration and login | 4.2        |
| 10.2 | User profile and settings   | 10.1       |
| 10.3 | User administration         | 10.1, 4.3  |
| 10.4 | Technical user management   | 10.3       |
| 10.5 | Role assignment UI          | 10.3, 4.3  |

### Phase 11 — Governance (6 steps)

| Step | Title                      | Depends on               |
| ---- | -------------------------- | ------------------------ |
| 11.1 | Tagging system             | Phase 5, Phase 8         |
| 11.2 | Subscription and ownership | Phase 5, 9.1             |
| 11.3 | Quality seal workflow      | 11.2, 9.1                |
| 11.4 | Comments and collaboration | 9.1, 10.1 (Post-MVP)     |
| 11.5 | To-do tracking             | 9.1, 10.1 (Post-MVP)     |
| 11.6 | Survey framework           | 10.1, Phase 5 (Post-MVP) |

### Phase 12 — Integration Surface (5 steps)

| Step | Title                  | Depends on   |
| ---- | ---------------------- | ------------ |
| 12.1 | OpenAPI documentation  | Phase 5      |
| 12.2 | GraphQL endpoint       | Phase 5, 6.1 |
| 12.3 | Webhook infrastructure | Phase 5, 4.4 |
| 12.4 | CSV/Excel import       | Phase 5, 6.4 |
| 12.5 | CSV/Excel export       | Phase 5, 6.3 |

### Phase 13 — Reporting and Analytics (7 steps)

| Step | Title                              | Depends on    |
| ---- | ---------------------------------- | ------------- |
| 13.1 | Reporting data pipeline            | Phase 5       |
| 13.2 | Application rationalization (TIME) | 5.2, 8.3      |
| 13.3 | Cloud migration strategy (6R)      | 5.2, 8.3      |
| 13.4 | Lifecycle and obsolescence risk    | 5.2, 5.5, 8.1 |
| 13.5 | Roadmap impact analysis            | 5.1, 5.4, 6.1 |
| 13.6 | Data quality metrics               | Phase 5, 11.3 |
| 13.7 | Adoption metrics                   | 10.1, 3.7     |

## Critical Paths

1. **Schema → API → Views**: 2.3 → 3.1 → 4.1 → 5.1 → 7.2 → 8.2
2. **Auth → RBAC → User management**: 3.8 → 4.2 → 4.3 → 10.1 → 10.3
3. **Entity APIs → Relationships → Search → Reporting**: Phase 5 → 6.1 → 6.2 → 13.1

## Risk Controls

- Feature flags active for per-module rollback during Phases 7–9
- NFR checks from [nfr.md](nfr.md) enforced before Phase 13 exit
- Gate checklist review from [gates.md](gates.md) at phase boundaries
- Each step includes tests; CI must be green before merging
