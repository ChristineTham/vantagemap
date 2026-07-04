# Getting Started — LeanIX vs VantageMap

**Scope note.** This 26-page SAP LeanIX "Getting Started" guide is an onboarding/orientation document, not a deep feature manual. It introduces LeanIX's core concepts (fact sheets, meta model, inventory), the three product tiers (APM / Architecture & Road Map Planning / Technology Risk & Compliance), the persona-based first-run flows (enterprise architect vs application/business owner), data-collection and governance features (subscriptions, comments, to-dos, surveys, quality seal, completion score), the UI navigation model (dashboards, inventory, reports, diagrams, More menu, search, help), and an onboarding-journey / support overview. Because it is orientation material, most items map to core EA-tool parity that VantageMap already targets. Pages cited from the nearest `[[page N]]` marker.

| # | LeanIX feature | Doc pages | VantageMap status | Evidence / gap note | Gap effort |
|---|----------------|-----------|-------------------|---------------------|------------|
| 1 | Fact sheets — structured info pages per architectural object; owner, lifecycle, description, links | 3, 14, 21 | EQUIVALENT | 12 fact-sheet types; universal detail view `src/app/[type]/[id]`, `src/components/FactSheetDetail.tsx`, `src/lib/fact-sheet-config.ts` | |
| 2 | 12 predefined fact-sheet types with type-specific attributes | 3 | EQUIVALENT | VantageMap also has 12 fact-sheet types (BusinessCapability, Application, Organization, etc.); enums in `src/db/schema/*.ts` | |
| 3 | Meta model — blueprint of relationships between fact-sheet types | 3, 6, 11 | PARTIAL | Relationships exist (one edge table, 35 types, validation in `src/lib/relationship-rules.ts`) but there is no visual/documented "meta model" concept surfaced to users | S |
| 4 | Meta-model customization (adjust structure/relationships, custom types) | 3, 11 | DEFERRED (PLANV4 — data-model admin) | Data model is fixed in code; no admin UI for custom fact-sheet types/fields. Brief lists this as a known gap; treat as data-model admin work | |
| 5 | Inventory — centralized repository to create/add/manage fact sheets with search + left-side filter pane | 4, 12, 17-18 | PARTIAL | No single generic "Inventory" view; equivalent split across `/search` (`src/components/SearchPageView.tsx`) + per-type pages (`/applications`, `/capabilities`). No unified configurable inventory grid | M |
| 6 | Search & filter within inventory; full-text top search bar to jump to a fact sheet | 12, 18 | EQUIVALENT | PostgreSQL full-text search with highlighting + faceted filtering; `src/app/search`, `src/components/SearchBar.tsx`, `SearchModal.tsx`, `src/app/api/search` | |
| 7 | Filter by subscription (see all fact sheets you subscribe to) | 13-14 | PARTIAL | Subscriptions modeled (`src/db/schema/tags.ts` `subscriptions`); no confirmed "my subscribed fact sheets" saved filter/view. Saved searches exist (`src/app/api/saved-searches`) so building it is small | S |
| 8 | Subscription roles / types — Responsible, Accountable, Observer (+ All) | 7 | EQUIVALENT | `subscriptionRoleEnum` = Responsible/Accountable/Observer (`src/db/schema/enums.ts:156`); `subscriptions` table + `src/components/SubscriptionPanel.tsx` | |
| 9 | Comments tab — post comments, notify responsible persons, request updates | 14, 16 | EQUIVALENT | `comments` table (`src/db/schema/governance.ts:24`); `src/components/CommentThread.tsx`; notifications via `src/lib/notifications.ts`. (No @mentions — minor gap noted in brief) | |
| 10 | To-Dos tab / To-dos in More menu | 14, 18 | EQUIVALENT | `todos` table (`src/db/schema/governance.ts:61`); `src/components/TodoList.tsx` | |
| 11 | Surveys — gather info from stakeholders, notify via Survey tab + email, responses update fields | 4, 16, 18 | PARTIAL | Basic surveys: `surveys`/`surveyQuestions`/`surveyResponses` (`src/db/schema/governance.ts:104`), `src/components/SurveyListView.tsx`. No campaign send/remind or auto-merge of responses into fields (no `campaign/remind/send` in code) | M |
| 12 | Quality Seal — approval mark; breaks when a non-responsible user edits; indicator button per fact sheet | 4, 16 | EQUIVALENT | State machine (Draft/Check Needed/Approved/Rejected) `src/lib/quality-seal.ts`; `qualitySealTransitions` table; `src/components/QualitySealBadge.tsx` | |
| 13 | Fact-sheet completion / completeness score | 4, 10 | PARTIAL | Completeness scored at report level (`src/lib/reports-extended.ts:283`, Data Quality report `src/app/reports/page.tsx:185`); not shown as a per-fact-sheet completion score on the detail view | S |
| 14 | Fact-sheet header + tabs (Fact Sheet / Subscriptions / Comments / To-Dos / Resources) | 14 | EQUIVALENT | Detail view has details/relationships/governance/audit tabs; governance panel bundles subscriptions/comments/to-dos (`src/components/FactSheetDetail.tsx`, `GovernancePanel.tsx`) | |
| 15 | Add/edit data inline (hover section → Edit/Add → Save) | 14 | EQUIVALENT | Edit via `src/components/FactSheetEditDialog.tsx`; create via `/[type]/new` (`FactSheetCreateForm.tsx`). Dialog-based rather than inline-hover, but equivalent capability | |
| 16 | Dashboards tab — entry point; predefined panels, charts, widgets, real-time metrics | 4, 16-17 | PARTIAL | Fixed dashboard page with health charts + report widgets (`src/app/page.tsx`, `DashboardCharts.tsx`, `ReportingCharts.tsx`). Not user-configurable panels/widgets or personal dashboards | M |
| 17 | Reports tab — default AND custom visual reports (landscape, matrix, roadmap) | 4, 17-18 | PARTIAL | Fixed report set (portfolio health, TIME, 6R, obsolescence, coverage, etc.) `src/lib/reports.ts` + `reports-extended.ts`, `/reports`. No user-built/custom reports, no landscape/matrix report builder | L |
| 18 | Diagrams tab — visual models of data flows/dependencies, break architecture into scopes | 4, 5, 17-18 | MISSING | No visual diagramming / free-draw / data-flow diagrams anywhere in `src/`. Confirmed absent; brief lists as known gap | L |
| 19 | Presentations (More menu) | 18 | MISSING | No presentations / export-to-PowerPoint feature in code | M |
| 20 | Workspace views — admin-configured views to limit displayed scope | 18 | PARTIAL | Saved searches exist (`src/app/api/saved-searches`) but no admin-managed, scoped "workspace views" concept | S |
| 21 | Import data — Excel import/export in bulk | 6, 9, 22 | EQUIVALENT | Import/export CSV + Excel(xlsx) and bulk operations per baseline; bulk UI `src/components/BulkEditDialog.tsx`, `BulkSelectToolbar.tsx` | |
| 22 | Out-of-the-box integrations & discovery (ServiceNow, SAP, Signavio, Collibra), Inventory Builder (AI from diagrams), reference catalog | 9-11 | DEFERRED (PLANV4 15.6 / 15.4) | Connector catalog & automated discovery = 15.6; AI extraction from diagrams = 15.4 | |
| 23 | Authentication — in-app email/password | 7 | EQUIVALENT | Better Auth email/password + sessions (`src/lib/auth-server.ts`) | |
| 24 | Single Sign-On (SSO) via IdP | 7-9 | DEFERRED (PLANV4 14.1) | SSO/SAML deferred | |
| 25 | SCIM provisioning (auto-sync user states from IdP) | 8-9 | DEFERRED (PLANV4 14.2) | SCIM provisioning deferred | |
| 26 | Standard roles — Viewer / Member / Admin, role-based permissions | 9 | EQUIVALENT | RBAC roles Viewer/Member/Admin (`src/lib/rbac.ts`); admin pages under `src/app/admin` | |
| 27 | Custom user roles (granular permissions via SSO) | 9 | DEFERRED (PLANV4 14.3) | IdP custom roles deferred | |
| 28 | Invite users to workspace (email invite + role) | 6-8 | EQUIVALENT | User management under `src/app/admin`; Better Auth handles user provisioning (`src/lib/auth-provision.ts`) | |
| 29 | Workspace concept — logical group of fact sheets/users; multiple parallel workspaces | 21 | DEFERRED (PLANV4 14.4 / 17.1) | Virtual workspaces / multi-tenant isolation deferred. Single-workspace model in V1 | |
| 30 | User profile — notification prefs, password reset, edit profile | 12, 19 | EQUIVALENT | `src/app/profile`; notifications with prefs (`src/lib/notifications.ts`, `src/db/schema/notifications.ts`) | |
| 31 | Notifications (in-app + email) | 16, 19 | EQUIVALENT | In-app + email notifications with preferences (`src/lib/notifications.ts`, `src/lib/email.ts`) | |
| 32 | Audit / changelog of all changes made | 22 | EQUIVALENT | Audit log (`src/lib/audit.ts`, `src/db/schema/audit.ts`); audit tab on fact-sheet detail | |
| 33 | Export personal/fact-sheet data as Excel | 22 | EQUIVALENT | CSV + xlsx export per baseline | |
| 34 | Branding settings / general settings (currency, language, fiscal year) for workspace | 24-25 | DEFERRED (PLANV4 17.3 / 16.7) | White-label/theming = 17.3; i18n/locale = 16.7 | |
| 35 | Help Tour ("Start Help Tour"), product updates megaphone, in-app support panel, extension hub, portals, SBOM explorer, architecture decisions, community/learning resources | 16-20 | MISSING | None of these onboarding-shell / marketplace features exist. Individually minor except as onboarding polish; extension hub/portals overlap PLANV4 15.5 (external portal) | S |
| 36 | Onboarding journey (6-8 week guided track, courses, Q&A, pilot rollout) | 24-26 | MISSING | Program/enablement content, not app functionality — out of scope for a self-hosted MVP; not counted as a product gap | |
| 37 | Application portfolio assessment (TIME, 6R, functional/technical fit, business criticality) | 10-11, 15 | EQUIVALENT | Application Portfolio page with TIME/6R/fit/criticality/lifecycle (`src/app/applications`, `src/components/ApplicationsView.tsx`, `applications.ts` schema) | |
| 38 | Persona onboarding flows (EA administrator vs application/business owner first steps) | 6-15 | PARTIAL | RBAC roles exist but no persona-tailored onboarding/landing experience. `LandingPage.tsx` is a single generic marketing page | S |

## Key gaps

The core EA-tool primitives are essentially all present — fact sheets, 12 types, relationships, subscriptions with R/A/O roles, comments, to-dos, quality seal, full-text search, audit, RBAC, Excel import/export. The meaningful gaps this onboarding doc surfaces are:

- **Diagrams (#18) — MISSING.** No visual diagramming / data-flow / dependency drawing. This is a first-class LeanIX pillar (its own nav tab) and the single biggest core-parity gap in this doc.
- **Generic configurable Inventory view (#5) — PARTIAL.** VantageMap splits inventory across `/search` + per-type pages; there is no unified, filterable inventory grid that the doc treats as the primary workhorse ("your go-to place").
- **Custom/configurable reports & report builder (#17) — PARTIAL.** VantageMap ships a fixed report set; LeanIX emphasizes default *and* custom reports (landscape, matrix, roadmap builder).
- **Configurable dashboards (#16) — PARTIAL.** VantageMap's dashboard is a fixed page, not user-composable panels/widgets.
- **Surveys as campaigns (#11) — PARTIAL.** Data model and list view exist, but no send/remind campaign flow and no auto-merge of responses back into fact-sheet fields.
- **Per-fact-sheet completion score (#13) — PARTIAL.** Completeness is computed at report level only, not shown as an inline score on each fact sheet as LeanIX does.
- **Presentations & onboarding-shell items (#19, #20, #35) — MISSING.** Presentations/export-to-PPT, admin workspace views, help tour, product-updates feed, extension hub/portals — mostly polish, but presentations and workspace views are genuinely useful.

Meta-model customization, SSO/SCIM/custom roles, multi-workspace, integrations/discovery, branding/i18n are all correctly **DEFERRED** to PLANV4, not counted as gaps.

## Equivalence summary

For an onboarding-scoped document, VantageMap is close to LeanIX on the *foundations*: fact sheets, the 12-type model, relationships, and the full governance/collaboration stack (subscriptions with Responsible/Accountable/Observer, comments, to-dos, quality-seal state machine, surveys, audit) all have direct code equivalents, as do search, RBAC, notifications, and Excel import/export. The gaps cluster in LeanIX's *visualization and configurability* layer — diagrams (entirely missing), a unified configurable inventory, custom report/dashboard builders, and survey campaigns — plus onboarding-shell conveniences (presentations, workspace views, help tour, extension hub). Net: strong parity on the data/governance core, materially behind on visual diagramming and user-configurable views/reports.
