# User Guide

> Documents **VantageMap V1 (MVP)**. Every screen below reflects the actual page
> components under `src/app/`.

VantageMap gives Chief Strategy Officers, Business Architects, and Product Leaders a
single view of business capabilities, applications, strategy objectives, technology
health, and roadmap initiatives. Navigation is via the left **Sidebar**
(`src/components/Sidebar.tsx`), which appears once you are signed in.

This guide walks through each route in reading order.

## Signing in

Public routes are `/`, `/login`, `/register`, `/forgot-password`, and
`/reset-password`. Everything else requires a session; unauthenticated requests are
redirected to `/login`. Authentication is email/password via Better Auth (see
[UAM.md](UAM.md)).

## Dashboard (`/`)

The landing screen for signed-in users summarises the whole portfolio:

- **Five summary cards** with counts and links: Capabilities, Applications, Objectives,
  Initiatives, and Tech Components.
- **Health and status charts** — application health distribution and initiative status
  distribution (rendered with Recharts, loaded dynamically).
- **Reporting & analytics charts** — TIME, 6R, portfolio health, and obsolescence-risk
  visualisations.
- **"Attention Needed" alert** — surfaces the top applications with Critical/Poor
  health, so risks are visible immediately.
- **Quick navigation cards** to Capabilities, Applications, Strategy, Radar, and
  Roadmap.

Unauthenticated visitors see a landing view instead of the dashboard.

## Business Capability Map (`/capabilities`)

A hierarchical map of what the business does, across three levels — Domain (L1), Area
(L2), and Capability (L3):

- Level-1 domains render as labelled boxes; level-2 areas sit in a grid within each
  domain; level-3 capabilities appear as inline chips.
- **Health indicators and lifecycle tags** are shown at each level, with a colour-coded
  legend.
- A **New Capability** button opens the fact-sheet creation form.
- An empty state is shown when no capabilities exist.

## Application Portfolio (`/applications`)

A filterable, sortable inventory of applications (rendered by the `ApplicationsView`
client component):

- The header shows the total application count and a **New Application** button.
- Each application carries lifecycle phase, health status, business criticality, fit
  scores, and its **TIME** (Tolerate / Invest / Migrate / Eliminate) and **6R**
  classifications.
- Filtering and sorting are handled client-side within the data grid.

## Strategy Map (`/strategy`)

A Balanced Scorecard laid out by the four strategic perspectives — **Financial**,
**Customer**, **Internal Process**, and **Learning & Growth**:

- Each perspective is a colour-coded section containing objective cards.
- Objective cards show name, health indicator, description, and lifecycle tag.
- Per-perspective counts and an overall header summarise the scorecard (total
  objectives, perspectives, and linked initiatives).

## Technology Radar (`/radar`)

A quadrant/ring visualisation of technology adoption (rendered by the `TechRadarView`
client component):

- Technologies (IT components) are plotted by **ring** — Adopt, Trial, Assess, Hold —
  and **quadrant** — Techniques, Tools, Platforms, Languages & Frameworks.
- The header summarises the number of technologies and categories.

## Strategic Roadmap (`/roadmap`)

A Gantt-style timeline of initiatives (rendered by the `RoadmapView` client component):

- Initiatives are plotted on a timeline with start/end dates and status.
- The header summarises the total initiative count and how many are In Progress.

## Reports & Analytics (`/reports`)

Portfolio analytics assembled from the reporting queries in `src/lib/reports.ts`:

- **Quick stats** — portfolio health score, count of TIME-classified applications,
  obsolescence risks, and average capability coverage.
- **TIME recommendations** table — suggested classifications driven by technical and
  functional fit scores, with the reasoning for each.
- **Obsolescence table** — items approaching or past end-of-life/end-of-support, with
  risk levels.
- **Capability coverage** — how many applications support each capability, and which
  capabilities are uncovered.
- **Portfolio health breakdown** — average technical/functional fit, and counts of
  applications in Phase Out and End of Life.

## Search (`/search`)

Cross-entity full-text search (rendered by `SearchPageView`):

- Accepts a query (`q`), optional entity-type filters (`types`), and pagination
  (`page`) via the URL.
- Backed by PostgreSQL full-text search across fact sheets, with faceted filtering by
  type.

## Governance (`/governance`)

The governance hub links to three workflows and shows summary stats (quality-approved
count, needs-review count, active surveys, tag groups):

### Quality Seal (`/governance/quality-seal`)

- Summary cards count fact sheets in each seal state: **Draft**, **Check Needed**,
  **Approved**, **Rejected**.
- A **Pending Review** section lists items in Check Needed with links to their detail
  pages; further sections group Draft, Approved, and Rejected items.
- The seal follows a state machine (`src/lib/quality-seal.ts`): a Member or Admin
  submits Draft → Check Needed; an Admin approves or rejects; a Member or Admin revises
  a rejected sheet back to Draft; an Admin can request re-review of an Approved sheet.

### Surveys (`/governance/surveys`)

- Lists surveys (rendered by `SurveyListView`) used to collect data-quality feedback
  from stakeholders. Surveys have questions and responses (see the `surveys`,
  `survey_questions`, `survey_responses` tables).

### Tags (`/governance/tags`)

- Manages tag groups and tags (rendered by `TagManagerWrapper`).
- Tag groups support three modes: **on-the-fly**, **hybrid**, and **predefined-only**,
  explained inline on the page.

## Fact Sheet detail and creation (`/[type]/[id]`, `/[type]/new`)

Every entity type shares a universal detail and create experience:

- **`/[type]/[id]`** renders the `FactSheetDetail` component for any entity
  (capability, application, objective, initiative, organisation, interface, data
  object, provider, platform, IT component, tech category). It shows the entity's
  fields plus its relationships, and returns a 404 for unknown types or ids.
- **`/[type]/new`** renders `FactSheetCreateForm` to create a new entity of that type.

Detail pages also expose collaboration features backed by the API: comments, to-dos,
tags, subscriptions, and quality-seal transitions.

## Profile (`/profile`)

Your account settings, organised into three tabs:

- **Profile** — update your display name (email is shown but not editable here).
- **Password** — change your password (current, new, confirm; minimum 8 characters).
- **Notifications** — toggle notification preferences (stored locally in the browser).

## Administration (`/admin/*`)

Admin-only screens for user management, roles, and API tokens are documented in
[ADMIN.md](ADMIN.md).
