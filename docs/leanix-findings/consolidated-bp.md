# Consolidated Best Practices Guide — LeanIX vs VantageMap

## Scope note

This 3-page SAP LeanIX "Consolidated Best Practices Guide" is not a feature spec — it is a
maturity-journey overview describing the Enterprise Architecture maturity path across three
levels (Level 1 Onboarding, Level 2 Experienced, Level 3 Expert). Each level lists focus,
use cases, outcomes, stakeholders, and the **LeanIX modules / key features / reports** that
support it (page 2), plus a resource index (page 3). The features referenced are therefore a
condensed roll-up of LeanIX's whole product surface. Below, each named feature/report is
extracted and classified against the VantageMap V1 implementation, verified in `src/`.

| # | LeanIX feature | Doc pages | VantageMap status | Evidence / gap note | Gap effort |
|---|---|---|---|---|---|
| 1 | Fact Sheets (Applications, Business Capabilities, Organisation) | 2 | EQUIVALENT | Fact sheet types incl. Application, BusinessCapability, Organization in `src/db/schema/*.ts`; universal detail at `src/app/[type]/[id]` | |
| 2 | Imports & Discoveries (initial inventory set-up) | 2 | PARTIAL | Import/export exist: `src/app/api/import`, `src/app/api/export`, `src/app/api/bulk`. But "Discoveries" = automated data ingestion from connected systems → DEFERRED portion. Manual/CSV import present; no discovery | M |
| 3 | Quality Seal | 2 | EQUIVALENT | State machine `src/lib/quality-seal.ts` (Draft/Check Needed/Approved/Rejected) | |
| 4 | Subscriptions (e.g. Application Owners) | 2 | EQUIVALENT | `src/app/api/fact-sheets/[type]/[id]/subscriptions/route.ts`; roles Responsible/Accountable/Observer | |
| 5 | Business Capability & Application Landscape reports | 2 | PARTIAL | Capability Map (`src/app/capabilities`) is a hierarchical tree, not a configurable landscape/matrix view. Application Portfolio table exists (`src/app/applications`). No configurable landscape report builder | M |
| 6 | AI Inventory builder | 2 | DEFERRED (PLANV4 15.4) | AI recommendations / auto-descriptions / NL — deferred | |
| 7 | TIME assessment (Gartner) | 2 | EQUIVALENT | TIME classification in Application Portfolio; report in `src/lib/reports.ts` | |
| 8 | 6R assessment | 2 | EQUIVALENT | 6R classification + distribution report `src/lib/reports.ts` | |
| 9 | Obsolescence Risk Management / Aggregated report | 2, 3 | EQUIVALENT | `src/app/api/reports/obsolescence-risk/route.ts` | |
| 10 | Use-case based / use-case-specific Dashboards | 2, 3 | MISSING | Dashboard `src/app/page.tsx` is fixed (no configurable/use-case dashboards, no widget builder). No dashboard config found | L |
| 11 | Collaboration: To-dos | 2, 3 | EQUIVALENT | To-Dos (assignee, due date, done) in governance schema | |
| 12 | Collaboration: Comments | 2, 3 | PARTIAL | Comments exist; no @mentions | S |
| 13 | Collaboration: Surveys | 3 | PARTIAL | Surveys API `src/app/api/surveys/*` (questions + responses); no campaign send/remind/merge | M |
| 14 | Collaboration: Notifications | 3 | EQUIVALENT | `src/lib/notifications.ts` (in-app + email + prefs) | |
| 15 | Automations (Best Practice) | 2, 3 | DEFERRED (PLANV4 15.1) | No-code event-condition-action framework — no `automation` code found; deferred | |
| 16 | Interfaces (fact sheet type) | 3 | EQUIVALENT | Interface fact sheet type present | |
| 17 | Data object (fact sheet type) | 3 | EQUIVALENT | DataObject fact sheet type present | |
| 18 | Reference Catalogs | 3 | MISSING | No reference catalog concept in schema (curated reference data / provider-fed catalogs). Distinct from Technology Radar | M |
| 19 | Roadmap report (View: Impact type) | 2 | PARTIAL | Roadmap Gantt (`src/app/roadmap`) + roadmap-impact report exist; no "impact type" roadmap *view* / visual impact analysis | M |
| 20 | Architecture Executive Dashboard & KPIs | 2, 3 | MISSING | No executive dashboard / KPI-tracking dashboard. KPI entity exists in `src/db/schema/strategy.ts` but no KPI/metrics dashboard view | L |
| 21 | Calculations (derived metrics engine) | 2, 3 | MISSING | No calculation/derived-field engine; only fixed aggregation queries in `src/lib/reports.ts` | L |
| 22 | Architecture Decisions | 2, 3 | MISSING | No architecture-decision entity or view (no `decision` in schema/app) | M |
| 23 | Self-built Software Discovery | 2, 3 | DEFERRED (PLANV4 15.6) | Discovery / automated ingestion — deferred | |
| 24 | Transformations (To-be / target-state) | 2 | DEFERRED (PLANV4 15.2) | Transformation scenarios / target-state modelling — deferred | |
| 25 | AI Governance | 2, 3 | DEFERRED (PLANV4 15.7) | AI governance use case — deferred | |
| 26 | Integrations (API, SAP Signavio, Jira, Confluence, Cloud ALM) | 2, 3 | DEFERRED (PLANV4 15.6) | Connector catalog / integrations — deferred (REST/GraphQL/Webhooks API surface exists but not the named connectors) | |
| 27 | Presentations | 3 | MISSING | No presentations / saved-view / export-to-PowerPoint feature | M |

## Key gaps

- **Configurable / use-case-specific dashboards (#10) & Architecture Executive Dashboard + KPIs (#20)** — VantageMap's dashboard is fixed; LeanIX centres its Level 2/3 story on tailorable, use-case and executive dashboards with KPI tracking. This is the biggest core-parity gap in this doc.
- **Landscape reports (#5) / configurable report views** — the capability map is a tree and the app portfolio is a table; there is no configurable landscape/matrix report builder, which is a staple LeanIX Level 1 deliverable.
- **Architecture Decisions (#22)** — a distinct LeanIX Level 3 entity with no VantageMap equivalent.
- **Calculations (#21)** — no derived-metric engine; VantageMap only has hard-coded aggregation reports.
- **Reference Catalogs (#18)** and **Presentations (#27)** — no equivalent concepts.
- Lighter partials: **Comments @mentions (#12, S)**, **Survey campaigns (#13, M)**, **Discoveries/import automation (#2, M)**, **Roadmap impact view (#19, M)**.

## Equivalence summary

For a maturity-journey overview, VantageMap covers Level 1 (Onboarding) and Level 2
(Experienced) LeanIX capabilities strongly: fact sheets, quality seal, subscriptions,
TIME/6R, obsolescence risk, and the To-dos/Comments/Surveys/Notifications collaboration set
are all present or near-present. The parity gaps concentrate at Level 3 (Expert) and around
*configurability* — configurable and executive/KPI dashboards, landscape/report view builders,
a calculations engine, architecture decisions, reference catalogs, and presentations are
genuinely missing (not deferred), while automations, transformations, discovery, integrations
and AI features fall into the PLANV4-deferred bucket. Net: solid onboarding/experienced-level
equivalence, with real core gaps in the "expert" configurable-reporting and decision-management
layer.
