# VantageMap

VantageMap is a high-level strategic modeling platform designed to bridge the gap between business vision and operational execution. It provides leaders with a unified, visual "source of truth" to navigate organizational complexity and drive informed decision-making.

---

## 💡 Naming Philosophy

The name VantageMap reflects our commitment to clarity, perspective, and direction:

- Vantage: Represents a "vantage point"—a position that affords a clear and commanding view of a situation. In a business context, this means moving beyond siloed data to see the entire organizational landscape from a strategic height.
- Map: A deliberate departure from technical jargon. A "Map" is a universal tool for navigation. It doesn’t just catalog assets; it shows where the organization stands today and defines the precise routes available to reach future goals.

VantageMap is built on the belief that strategy is only as good as your ability to see it.

---

## 🎯 Project Vision

VantageMap is designed for Chief Strategy Officers (CSOs), Business Architects, and Product Leaders who need to translate abstract goals into concrete roadmaps.
While traditional tools focus on technical inventory, VantageMap focuses on Business Capabilities, Value Streams, and Strategic Outcomes.

## Key Focus Areas:

- Strategic Alignment: Ensuring every project and resource is directly mapped to a corporate objective.
- Capability Modeling: Visualizing what the business does (rather than just what it owns) to identify gaps and redundancies.
- Agile Pivoting: Providing the data needed to shift directions quickly when market conditions change.

---

## 🚀 Key Features

- Dynamic Capability Heatmaps: Instantly visualize business performance and investment levels across different organizational functions.
- Scenario Sandbox: Model "What-If" shifts in strategy to see the downstream impact on resources and goals before committing.
- The "North Star" Dashboard: A high-level executive view that translates operational data into strategic risk and opportunity.
- Open Integration Layer: A robust API designed to pull data from across the enterprise, turning fragmented metadata into a cohesive strategic narrative.

## Overview

VantageMap is an open-source enterprise architecture and business strategy platform built with **Next.js 16**, **React 19**, **TypeScript 6**, and **Tailwind CSS v4**. It provides thirteen integrated views:

| View                        | Route           | Description                                                              |
| --------------------------- | --------------- | ------------------------------------------------------------------------ |
| **Dashboard**               | `/`             | At-a-glance summary of capabilities, applications, KPIs, and initiatives |
| **Business Capability Map** | `/capabilities` | Hierarchical capability map colour-coded by health status                |
| **Application Portfolio**   | `/applications` | Inventory of IT applications with fit scores, lifecycle, TIME            |
| **Strategy Map**            | `/strategy`     | Balanced Scorecard with objectives, KPIs, and linked initiatives         |
| **Technology Radar**        | `/radar`        | ThoughtWorks-style radar across Adopt / Trial / Assess / Hold rings      |
| **Strategic Roadmap**       | `/roadmap`      | Gantt-style timeline of all strategic initiatives                        |
| **Reports & Analytics**     | `/reports`      | Portfolio health, TIME, 6R, obsolescence, coverage analysis              |
| **Cross-Entity Search**     | `/search`       | Full-text search with faceted filtering across all entity types          |
| **Governance Hub**          | `/governance`   | Quality seal, tags, surveys, data stewardship                            |
| **Administration**          | `/admin/*`      | User management, roles, API tokens, technical users                      |
| **User Profile**            | `/profile`      | Account settings, password change, notifications                         |
| **Fact Sheet Detail**       | `/[type]/[id]`  | Universal detail view for any entity                                     |
| **Create Fact Sheet**       | `/[type]/new`   | Entity creation form with relationship attachment                        |

## Getting Started

```bash
npm install        # install deps
npm run dev        # dev server (http://localhost:3000)
npm run build      # production build
npm run lint       # ESLint
npm run test       # Vitest (487+ tests)
npm run type-check # TypeScript strict
npm run db:migrate # run database migrations
npm run db:seed    # populate sample data
npm run db:studio  # Drizzle Studio GUI
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
DATABASE_URL="postgresql://user:password@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require"
BETTER_AUTH_SECRET="your-32-char-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

See [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) for full setup instructions.

## Tech Stack

| Layer        | Technology                                             |
| ------------ | ------------------------------------------------------ |
| Framework    | Next.js 16.2.6 (App Router)                            |
| Language     | TypeScript 6 (strict mode)                             |
| UI Library   | React 19.2.6                                           |
| Styling      | Tailwind CSS v4 + [Rosely design system](DESIGN.md)    |
| Components   | shadcn/ui (Base UI variant) — 13 primitives            |
| Icons        | Lucide React                                           |
| Charts       | Recharts 3 (dynamically loaded)                        |
| Database     | PostgreSQL 16 (hosted on Neon)                         |
| ORM          | Drizzle ORM (22 tables, 28 enums)                      |
| Auth         | Better Auth (email/password, sessions, RBAC)           |
| API          | REST (29 route groups) + GraphQL                       |
| Search       | PostgreSQL Full-Text Search                            |
| Integrations | Webhooks (HMAC-signed), CSV import/export, OpenAPI 3.1 |
| Testing      | Vitest 4 (487+ tests)                                  |
| Hosting      | Vercel Hobby (MVP), Azure App Service (production)     |

## Project Structure

```
src/
  app/
    page.tsx              # Dashboard
    layout.tsx            # Root layout (Sidebar + main)
    (auth)/               # Login, register, forgot/reset password
    admin/                # User management, roles, API tokens
    governance/           # Quality seal, surveys, tags
    profile/              # User profile settings
    reports/              # Reporting and analytics
    search/               # Cross-entity search
    [type]/               # Universal fact sheet detail/create
    api/                  # 29 API route groups (REST + GraphQL)
    capabilities/         # Business Capability Map
    applications/         # Application Portfolio
    strategy/             # Strategy Map (Balanced Scorecard)
    radar/                # Technology Radar
    roadmap/              # Strategic Roadmap (Gantt)
  components/
    ui/                   # shadcn/ui primitives (13 components)
    Sidebar.tsx           # Navigation sidebar
    DataTable.tsx         # Reusable data table
    ...                   # 40+ shared components
  db/
    schema/               # 13 schema files, 22 tables, 28 enums
    index.ts              # Neon HTTP connection
    migrate.ts            # Migration runner
    seed.ts               # Idempotent seed script
  lib/
    api-response.ts       # Standard response envelope
    api.ts                # Typed fetch client
    auth-server.ts        # Better Auth server config
    crud-factory.ts       # Shared CRUD route handler factory
    data.ts               # TypeScript types + data layer
    graphql-schema.ts     # GraphQL schema definition
    neon-retry.ts         # Retry utility for transient failures
    openapi.ts            # OpenAPI 3.1 spec
    quality-seal.ts       # Quality seal state machine
    rbac.ts               # Role-based access control
    reports.ts            # Reporting aggregation queries
    webhook-engine.ts     # Webhook delivery engine
  middleware.ts           # Auth route protection
  env.ts                  # Environment validation (Zod)
docs/
  PLAN.md                 # V1 plan (Phases 0–13, all complete)
  PLANV2.md               # Post-MVP roadmap (Phases 14+)
  TESTING.md              # Testing and verification guide
  adr/                    # 8 architecture decision records
  phase-0/                # Requirements, epics, NFRs, gates
```

## Documentation

| Document                                           | Purpose                                   |
| -------------------------------------------------- | ----------------------------------------- |
| [AGENTS.md](AGENTS.md)                             | Project guidelines and coding conventions |
| [DESIGN.md](DESIGN.md)                             | Rosely colour palette and design system   |
| [docs/PLAN.md](docs/PLAN.md)                       | V1 MVP implementation plan (complete)     |
| [docs/PLANV2.md](docs/PLANV2.md)                   | Post-MVP roadmap                          |
| [docs/TESTING.md](docs/TESTING.md)                 | Testing and verification procedures       |
| [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) | Setup and onboarding guide                |
| [docs/MODEL.md](docs/MODEL.md)                     | Canonical data model                      |
| [docs/UAM.md](docs/UAM.md)                         | User access management model              |
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md)           | End-user workflow guide                   |
| [docs/DEVELOPER.md](docs/DEVELOPER.md)             | API and integration reference             |
| [docs/ADMIN.md](docs/ADMIN.md)                     | Administration features                   |
| [docs/adr/](docs/adr/README.md)                    | Architecture decision records             |

## 📄 License

MIT

---

## 🤝 Contributing

We are building a community of contributors who believe that Business Architecture is the missing link in the modern enterprise. Whether you are a developer, a designer, or a strategist, we welcome your input in making organizations more legible and agile.

---
