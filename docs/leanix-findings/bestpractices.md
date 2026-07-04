# Best Practices — LeanIX vs VantageMap

**Scope note.** This 54-page SAP LeanIX "Best Practices" document bundles four end-to-end
implementation guides: (1) **Contract Data** best practices (pages 2–37) — the largest section,
covering a Contract fact-sheet extension, lifecycle automations, cost calculations, ServiceNow/Jira
integration, contract reports/KPIs, onboarding and governance; (2) **Cost Management** (pages 38–48)
— project/application/infrastructure cost fields, TCO, calculations and cost-allocation reports;
(3) **Target Architecture Planning** (pages 48–51) — initiatives, transformations, impacts, target
architecture diagrams, transformations explorer; and (4) **Security Best Practices** (pages 51–54)
— RBAC, SSO/SAML, JIT provisioning, encryption, audit logs, PII/GDPR, API-token and integration
security. Because these are *best-practice playbooks*, they lean heavily on LeanIX's configuration
primitives (Meta Model Configuration, Automations, Calculations, KPIs, configurable Reports,
Dashboards). Many of those primitives are the exact areas VantageMap fixes in code, so this document
surfaces several core EA-tool parity gaps as well as a number of DEFERRED items.

Verified against code: `src/db/schema/enums.ts` (factSheetType has 12 types, no Contract),
`src/db/schema/strategy.ts` (Initiative has a single `budget` field, KPI is a sub-entity of
StrategicObjective only), `src/db/schema/applications.ts` (no cost/TCO fields), `src/db/schema/tags.ts`
(subscriptions carry Responsible/Accountable/Observer roles; tag groups have modes), `src/db/schema/governance.ts`
(surveys, comments, todos with assignee + dueDate), `src/lib/quality-seal.ts` (Draft/Check Needed/Approved/Rejected),
`src/lib/rbac.ts` (Viewer/Member/Admin), `src/lib/webhook-engine.ts`, `src/db/schema/audit.ts`.

## Feature table

| # | LeanIX feature | Doc pages | VantageMap status | Evidence / gap note | Gap effort |
|---|----------------|-----------|-------------------|---------------------|------------|
| 1 | **Contract fact sheet type** (track vendor agreements, renewals, spend) | 2–5, 21 | MISSING | 12 fact-sheet types in `factSheetTypeEnum`; no Contract. "Contract" appears only in `seed.ts`. Data model is fixed in code — no admin UI to add a fact-sheet type. Core EA parity gap. | L |
| 2 | **Meta Model Configuration** — add custom attributes, mark attributes mandatory, conditional attributes | 5–6 | MISSING | No data-model admin UI. Custom data goes only into a fixed `customFields` (jsonb) per fact sheet; no per-type schema, no mandatory-field enforcement, no conditional attributes. `src/lib/fact-sheet-config.ts` is static. | L |
| 3 | **Automations** — no-code event→condition→action rules (create to-do, set field, add/remove tag, on create / lifecycle-state-change with day offsets) | 6–16 | DEFERRED | Automation framework / no-code event-condition-action workflows = PLANV4 15.1. Underlying actions (to-dos, tags, notifications) exist but are not rule-driven. | — |
| 4 | **Lifecycle-based renewal tracking** (notice-period phase, day-offset triggers, renewal-status Backlog/Renew/Terminate) | 7–16 | PARTIAL | Generic `lifecyclePhaseEnum` (Plan/Phase In/Active/Phase Out/End of Life) exists but is application-oriented; no contract-specific notice-period/renewal-decision states and no time-based triggering (that part is DEFERRED 15.1). | M |
| 5 | **Subscriptions with RACI roles** (Responsible / Accountable / Observer) | 9–11, 35–36 | EQUIVALENT | `subscriptionRoleEnum` = Responsible/Accountable/Observer; `subscriptions` table in `src/db/schema/tags.ts` links user↔fact sheet with role. Matches doc's RACI ownership model. | — |
| 6 | **To-Dos / Action Items** (assignee, title, description, due-in-days) | 9–16 | EQUIVALENT | `todos` table (`src/db/schema/governance.ts`): assigneeId, title, description, dueDate, done. Only the *automated creation* of to-dos is missing (DEFERRED 15.1). | — |
| 7 | **Tag groups & tags** (name, colour, description, Single/Multi mode) | 8–9 | EQUIVALENT | `tags.ts`: TagGroup with `tagModeEnum` (mode), Tag with colour, TagAssignment. Matches the Contract Status tag-group example. | — |
| 8 | **Calculations** — server-side JS formulas aggregating/propagating field values across relations (e.g. contract cost → application TCO) | 16–20, 45–47 | MISSING | No calculation engine; no user-defined formulas over fact-sheet fields or relations. Reports aggregate in fixed SQL only (`src/lib/reports.ts`, `reports-extended.ts`). Core parity gap. | L |
| 9 | **Application cost / TCO fields** (license, maintenance, support, total cost of ownership) | 16–20, 40–41 | MISSING | No cost fields on `applications.ts`. TCO, license/maintenance/support cost, cost-per-BC allocation all absent. | M |
| 10 | **Initiative/project cost** (CapEx/OpEx budget & ordered, provider costs) | 38–39 | PARTIAL | `initiatives.budget` is a single numeric field; no CapEx/OpEx split, no budget-vs-ordered, no provider-cost breakdown. | M |
| 11 | **Infrastructure cost on app↔IT-component relation** (total annual cost, cost allocation) | 42–43 | MISSING | Relationship table has generic `attributes` jsonb (`relationships.ts` comment mentions "annual cost") but no modelled cost fields, no allocation logic, no IT-component cost rollup. | M |
| 12 | **Cost-allocation to business capabilities / organizations** (equal split, leading-BC, %-based, per-user) | 41–42, 45–47 | MISSING | Requires calculations + support-type on relations; none implemented. | L |
| 13 | **Configurable Reports** — Landscape, Roadmap, Portfolio, Matrix, cluster/filter/circle-size builder | 23–29, 39–44 | MISSING | Reports are a fixed set (portfolio health, TIME, 6R, obsolescence, coverage, roadmap impact, data-quality, adoption) — not a user-configurable report builder. `src/app/api/reports/*` are hard-coded. Core parity gap. | L |
| 14 | **Kanban / renewals-board (landscape cluster) view** | 24–25 | MISSING | No Kanban clustering view; roadmap is a fixed Gantt, portfolio a fixed table. | M |
| 15 | **User-defined KPIs on Dashboards** (COUNT/aggregation operators, filters, absolute/type, add-as-widget) | 30–34 | PARTIAL | `kpis` table exists but is a sub-entity of StrategicObjective (name, target/current value, unit) — not a workspace-wide, formula-driven KPI you build with COUNT/filters and drop on a configurable dashboard. Dashboard is a fixed page, not a widget canvas. | M |
| 16 | **Data-quality / completeness KPIs** ("Contracts without lifecycle data", "Applications without contract") | 32–33, 36 | PARTIAL | VantageMap has a fixed data-quality/completeness report (`src/app/api/reports/data-quality`), but not arbitrary "fact sheets missing field X" KPIs the user configures. | S |
| 17 | **Quality Seal** — periodic review / re-certification of data | 36 | EQUIVALENT | Quality-seal state machine (Draft/Check Needed/Approved/Rejected) in `src/lib/quality-seal.ts`. Matches the doc's "Quality Seal for periodic review and re-certification". | — |
| 18 | **Mandatory fields gate quality-seal approval** | 6, 36 | MISSING | No mandatory-field configuration or enforcement; quality-seal approval is not blocked by empty required fields. Part of gap #2. | M |
| 19 | **Review cadence / governance process** (monthly data-quality, quarterly renewal, annual strategic) | 36 | PARTIAL | This is organizational process, but LeanIX supports it with to-dos + quality seal + KPIs, which VantageMap partly has (to-dos, quality seal). No scheduled/recurring review mechanism. | S |
| 20 | **Adoption / workspace-usage metrics** (contract coverage, stakeholder adoption) | 34, 37 | PARTIAL | VantageMap has an `adoption` report (`src/app/api/reports/adoption`), but not the workspace-usage-and-adoption KPI dashboards LeanIX references. | S |
| 21 | **ServiceNow / Jira integration** for contract sync (field & relation mapping) | 3, 21–23 | DEFERRED | Connector catalog / integrations (ServiceNow/Jira) and automated data ingestion = PLANV4 15.6. | — |
| 22 | **Apptio / cost-tool integration** for cost data | 45 | DEFERRED | Connector catalog / integrations = PLANV4 15.6. | — |
| 23 | **Excel / CSV import of fact-sheet (contract, cost) data** | 22, 45 | EQUIVALENT | Import/export CSV + Excel(xlsx) is in the V1 baseline (bulk operations, import/export). | — |
| 24 | **Reprovision workspace / transformation provisioning** | 4 | DEFERRED | Transformation scenarios / target-state modelling = PLANV4 15.2. | — |
| 25 | **Transformations & Impacts** (grouped planned changes, per-fact-sheet impacts) | 48–50 | DEFERRED | Transformation scenarios / target-state modelling = PLANV4 15.2. | — |
| 26 | **Target architecture diagrams** (canvas, current/target toggle, sync to inventory) | 48–50 | MISSING | Visual diagramming / free-draw / data-flow diagrams — a known not-implemented area; not explicitly in the DEFERRED list, so counts as a gap. | L |
| 27 | **Transformations Explorer** (central view of synced transformations, move between initiatives) | 50 | DEFERRED | Target-state modelling = PLANV4 15.2. | — |
| 28 | **Roadmap report with milestones** (adjustable milestone dates on initiatives) | 50 | PARTIAL | Roadmap page renders a Gantt of initiatives (`src/app/roadmap/page.tsx`) but there is no milestone data model (`grep milestone` → none in schema) — milestones are cosmetic copy only. | M |
| 29 | **Landscape report: Impact View** (which fact sheets affected by initiatives, filter by impact type) | 50 | DEFERRED | Visual impact/dependency analysis tied to transformations = PLANV4 15.2. | — |
| 30 | **Architecture Decisions** (record decisions, AI-assisted from diagram) | 49–50 | DEFERRED | AI recommendations / auto-descriptions = PLANV4 15.4; decision-record capability itself is not in V1 (no ADR entity in schema). | — |
| 31 | **RBAC roles** (viewer / member / admin) | 51 | EQUIVALENT | `src/lib/rbac.ts` roles = Viewer/Member/Admin — exact match to the doc's standard roles. | — |
| 32 | **Custom user roles / fact-sheet-level permissions** (via IdP) | 51–52 | DEFERRED | IdP custom roles = PLANV4 14.3; virtual workspaces & ACL/ACE fact-sheet scoping = PLANV4 14.4. | — |
| 33 | **SSO / SAML 2.0, JIT provisioning, IdP role management, MFA** | 51–52 | DEFERRED | SSO/SAML = PLANV4 14.1; SCIM provisioning = 14.2; IdP roles = 14.3. | — |
| 34 | **API-token security** (rotate, least-privilege, revoke) | 53 | EQUIVALENT | API tokens implemented (`src/db/schema/api-tokens.ts`, admin API-token/technical-users pages). Rotation/revocation is admin-managed. | — |
| 35 | **Webhooks for event monitoring / SIEM** (HMAC, near-real-time events) | 52–53 | EQUIVALENT | `src/lib/webhook-engine.ts` (HMAC-SHA256, retry). Matches the security-monitoring webhook recommendation. | — |
| 36 | **Audit logs** (record user activity & changes) | 53 | EQUIVALENT (and better) | `src/db/schema/audit.ts` + automatic audit via `after()`. LeanIX notes UI self-service audit access is *not* available (download via support); VantageMap exposes audit in the fact-sheet detail tab. | — |
| 37 | **PII change audit report / anonymization / GDPR deletion** | 53–54 | DEFERRED | Data residency / GDPR export = PLANV4 17.4; archived-user auto-deletion not in V1. | — |
| 38 | **Encryption at rest (AES-256) & in transit (TLS 1.3), IP allowlisting, multi-tenant isolation** | 52–53 | DEFERRED | Infrastructure/hosting concerns; multi-tenancy/data isolation = PLANV4 17.1. Encryption in transit is provided by the hosting platform (Vercel/Azure), not app code. | — |

## Key gaps

Core EA-tool parity gaps (not advanced/PLANV4) surfaced by this document:

- **No Contract fact sheet type and no way to add one** (#1, #2). The entire contract best-practice
  guide (pages 2–37, ~65% of the doc) presumes a configurable meta model. VantageMap's fact-sheet
  types and fields are fixed in code, so contract management can't be modelled at all.
- **No Calculations engine** (#8, #12). LeanIX's cost aggregation, TCO propagation and cost-allocation
  all rely on user-defined server-side calculations over fields and relations. VantageMap has only
  fixed-SQL reports — the biggest single capability gap after the meta model.
- **No cost / TCO / financial fields** (#9, #10, #11). Applications have no license/maintenance/support/
  TCO fields; initiatives have only a single `budget`; relations carry no modelled cost. The whole Cost
  Management guide (pages 38–48) has almost no VantageMap counterpart.
- **No configurable report builder** (#13, #14). Landscape/Roadmap/Portfolio/Matrix reports with
  cluster/filter/circle-size configuration and Kanban boards are central to every guide; VantageMap
  ships a fixed report set instead of a builder.
- **No user-configurable KPIs on dashboards** (#15, #16). LeanIX KPIs are COUNT/aggregation formulas
  with filters, placed as widgets on dashboards. VantageMap KPIs are static sub-entities of strategic
  objectives, and the dashboard is a fixed page.
- **Mandatory-field enforcement gating the quality seal** (#18) and **milestone modelling on the
  roadmap** (#28) are smaller but concrete gaps.
- **Target architecture diagrams** (#26) — visual canvas modelling — is a genuine gap (not on the
  DEFERRED list), though the surrounding transformation machinery (#24, #25, #27, #29) is DEFERRED to
  PLANV4 15.2.

## Equivalence summary

VantageMap matches LeanIX well on the *governance primitives* this document builds on — RACI
subscriptions, to-dos, tag groups with modes, the quality-seal state machine, RBAC roles, webhooks,
and audit logging are all EQUIVALENT (and audit access is arguably better than LeanIX's support-only
model). But the document's four playbooks are fundamentally *configuration-driven*, and VantageMap's
data model, calculations, reports and KPIs are fixed in code. As a result the two largest guides —
Contract Data and Cost Management — are almost entirely gaps (missing Contract fact sheet, meta-model
config, calculations, cost/TCO fields, configurable reports and KPIs). The Security guide is the
closest to parity, with most items either EQUIVALENT or legitimately DEFERRED (SSO/SAML, GDPR,
encryption/tenancy). Net: VantageMap has the governance *building blocks* but lacks the *authoring/
configuration layer* that lets a LeanIX customer actually implement these best practices themselves.
