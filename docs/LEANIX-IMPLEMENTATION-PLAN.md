# VantageMap — LeanIX Core-Parity Implementation Plan

**Status:** Proposal for review
**Companion:** [LEANIX-GAP-REPORT.md](LEANIX-GAP-REPORT.md) (evidence & full gap register)
**Relationship to [PLANV4.md](PLANV4.md):** This plan covers the **core EA-tool parity gaps** the LeanIX document review surfaced — features that are *not* already deferred to PLANV4. It slots in as **Phases 18–24**, complementing (not replacing) PLANV4's Phases 14–17. Where a feature borders a deferred phase, the dependency is noted.

Execution principles are unchanged from V1/V2: backend-before-frontend, each step independently testable/deployable, every step ships tests, all work follows [AGENTS.md](../AGENTS.md).

---

## Sequencing rationale — foundation first

The single most important finding is that most LeanIX differentiators are **configurability surfaces** built on two primitives VantageMap lacks:

1. **A dynamic field/meta-model layer** (typed field definitions per fact-sheet type, values, and metadata) — unlocks custom fields, cost/TCO, mandatory attributes, completion weighting, calculations, and per-attribute permissions.
2. **A saved "view/definition" layer** (persisted, shareable, parameterised configurations) — unlocks the report builder, dashboards, saved inventory views, and collections.

Building these two foundations first means the later, high-visibility work (report builder, dashboards, cost analytics) becomes largely additive rather than requiring rework.

```
Phase 18 (Meta-model & field foundation) ─┬─→ Phase 20 (Calc, cost, metrics)
                                          ├─→ Phase 21 (Data collection & governance)
                                          └─→ Phase 23 (Configurable authorization)
Phase 19 (View/definition foundation) ────┬─→ Phase 22 (Reports & dashboards)
                                          └─→ Phase 24 (Inventory & capability-map UX)
Phase 18.3 externalId ────────────────────→ (future PLANV4 15.6 connectors)
Standalone: Phase 25 (Diagramming), Phase 26 (API parity), Phase 27 (User lifecycle)
```

---

## Phase 18 — Meta-model & field foundation

Turns the fixed-in-code model into a configurable one. **Highest leverage; do first.**

| Step | Scope | Effort | Depends on |
|---|---|---|---|
| 18.1 | **Field-definition layer.** New `field_definitions` table (per fact-sheet type: key, label, data type, section, searchable/filterable flags, width, order, options). Fact-sheet values move from opaque `customFields` jsonb to typed, validated values. Detail/create forms render from definitions. | L | — |
| 18.2 | **Custom fact sheet types & subtypes.** Replace hard enums with a `fact_sheet_type_config` registry (type, label, colour, icon, subtypes). Migrate the 12 built-ins into config. Universal pages read from the registry. | L | 18.1 |
| 18.3 | **externalId identity mapping.** Add `external_id` (+ source) to all fact sheets; make import/bulk upsert on it (the bulk route already parses `externalId` — stop discarding it). Foundation for future connectors (PLANV4 15.6). | M | — |
| 18.4 | **Attributes on relations.** Extend the edge table with a typed payload (usage type, cost, CRUD, obsolescence status). Definition-driven like 18.1. | M | 18.1 |
| 18.5 | **Configurable relations & conditional attributes.** Admin-defined relation types + multiplicity; activator logic to show/require fields conditionally. | L | 18.1, 18.2 |
| 18.6 | **Meta-model admin UI.** Admin screens to manage 18.1–18.5 (fields, types, subtypes, relations, colours, translations). | L | 18.1–18.5 |

## Phase 19 — View / definition foundation

The persistence + sharing layer every configurable surface reuses.

| Step | Scope | Effort | Depends on |
|---|---|---|---|
| 19.1 | **Saved definition store.** Generic `view_definitions` table (kind, owner, shared/default flags, JSON config, permissions). Powers reports, dashboards, inventory views, collections. Extend existing `saved_searches` into this model. | M | — |
| 19.2 | **Collections & favorites.** "Add to collection" / favorite across fact sheets, reports, diagrams; a Collections page. | M | 19.1 |
| 19.3 | **Sharing & permissions on definitions** (private / shared / workspace-default). | S | 19.1, 23.1 |

## Phase 20 — Calculations, cost & metrics

| Step | Scope | Effort | Depends on |
|---|---|---|---|
| 20.1 | **Cost / TCO fields** (CapEx/OpEx on applications, IT components, initiatives) via the field layer. | M | 18.1 |
| 20.2 | **Calculations engine.** User-defined derived fields (formula over fields/relations); auto-derive TIME/6R from fit; cost roll-up along relations. Sandboxed evaluation. | L | 18.1, 18.4 |
| 20.3 | **Metrics (time-series).** Metric store + trend charts; scheduled snapshots. | M | 18.1 |
| 20.4 | **Custom KPIs** (absolute/%, aggregations, historical) surfaced as dashboard cards. | M | 20.3, 19.1 |

## Phase 21 — Data collection & governance depth

| Step | Scope | Effort | Depends on |
|---|---|---|---|
| 21.1 | **Survey builder + campaigns.** Conditional/calculated questions; send/schedule/remind; auto-merge responses into fact-sheet fields. | L | 18.1 |
| 21.2 | **Mandatory attributes + header completion score.** Weighted completeness on the fact-sheet header; gate Quality Seal approval on required fields. | M | 18.1 |
| 21.3 | **Attachments / Resources** (files, links, logos) on fact sheets. | M | — |
| 21.4 | **Subscription named roles + Contacts.** Configurable subscription roles; non-user "contact" subscribers with promote-to-user. | M | 18.6 |
| 21.5 | **Comment @mentions UI** (backend already wired — add the picker) and a unified "assigned to me" inbox. | S | — |
| 21.6 | **Architecture Decisions (ADR).** Decision records with a review workflow, reusing the Quality Seal state machine. | M | — |
| 21.7 | **Milestones + roadmap dependencies.** Milestone entity on initiatives; render Requires/Blocks dependency lines; obsolescence-risk roll-up to applications with %-views. | M | 18.4 |

## Phase 22 — Configurable reports & dashboards *(highest user-visible value)*

| Step | Scope | Effort | Depends on |
|---|---|---|---|
| 22.1 | **Report engine + views.** Report definitions with switchable colour/view overlays, cluster-by, filters, drill-down, URL state; save/share. | L | 18.1, 19.1 |
| 22.2 | **Landscape (heat-map) + Matrix reports.** | L | 22.1 |
| 22.3 | **Portfolio (bubble), Circle Map, Cost, World-map reports.** | M | 22.1, 20.1 |
| 22.4 | **Report export** (PDF / PNG / HTML). | M | 22.1 |
| 22.5 | **Dashboard builder.** Panel/widget model; per-user/default/shared; global cross-panel filter; KPI cards with history; executive/persona dashboards. | L | 19.1, 20.4 |
| 22.6 | **Presentations** (slide assembly + PPT/PDF export). | M | 22.1 |

## Phase 23 — Configurable authorization

| Step | Scope | Effort | Depends on |
|---|---|---|---|
| 23.1 | **Editable role permissions.** Move the hardcoded RBAC matrix into data; admin UI to toggle per-role operations (roles page becomes editable). | L | — |
| 23.2 | **Per-type / per-attribute permissions.** CRUD gating per fact-sheet type and per field. | L | 18.1, 23.1 |
| 23.3 | **Subscription-based permission gating.** | M | 23.1 |

## Phase 24 — Inventory & capability-map UX

| Step | Scope | Effort | Depends on |
|---|---|---|---|
| 24.1 | **Generic Inventory grid.** Unified, configurable, filterable list across all types; Manage Columns; saved view configs. | M | 18.1, 19.1 |
| 24.2 | **Inline table editing** (cell edit, copy/paste/autofill). | L | 24.1 |
| 24.3 | **Advanced boolean filters** (AND/OR/NOT) + point-in-time lifecycle filter. | M | 24.1 |
| 24.4 | **Capability-map heat overlays** by metric (fit/cost/risk/lifecycle); paint coverage/duplication on the map; collapse/expand/zoom/search at scale. | M | 22.1 |

## Phase 25 — Diagramming *(standalone; high effort, high visibility)*

| Step | Scope | Effort | Depends on |
|---|---|---|---|
| 25.1 | **Free-draw + data-flow diagram editor** (canvas, likely a vetted OSS library), fact-sheet-linked nodes. | L | — |
| 25.2 | **Templates, versioning, layers, permissions, collections.** | L | 25.1, 19.1 |
| 25.3 | **Visual dependency / impact explorer** (graph view over relationships). | M | — |

## Phase 26 — API & developer parity

| Step | Scope | Effort | Depends on |
|---|---|---|---|
| 26.1 | **GraphQL mutations** + facet filters + relay cursor pagination (bring GraphQL to write parity — LeanIX centres writes there). | L | — |
| 26.2 | **Webhook PULL mode**, richer event catalog, per-target auth; **API rate limiting** (429/Retry-After). | M | — |
| 26.3 | **Generic inbound ingestion / sync-run model** (upsert-by-external-key, run history, staging inbox) — the foundation under any future PLANV4 15.6 connector. | L | 18.3 |
| 26.4 | **Custom Reports SDK** (embeddable reporting API + scaffolding + upload). | L | 22.1 |

## Phase 27 — User lifecycle & compliance (non-SSO)

| Step | Scope | Effort | Depends on |
|---|---|---|---|
| 27.1 | **GDPR lifecycle.** 90-day auto-deletion of archived users; self-service account deletion; user data export; PII change audit report. | M | — |
| 27.2 | **Admin UX.** Bulk invite; re-invite; admin-configurable default role; user detail page with last-login + subscriptions. | S | — |
| 27.3 | **Native MFA / 2FA (TOTP)** for non-SSO tenants. | M | — |

---

## Prioritisation guidance

| Priority | Phases | Rationale |
|---|---|---|
| **P1 — parity foundations** | 18, 19 | Unlock the majority of remaining gaps; avoid rework. |
| **P2 — highest visible value** | 22, then 20 | Configurable reports/dashboards + cost analytics are what users most associate with LeanIX. |
| **P3 — governance & decisions** | 21, 23 | Deepen data collection, ADRs, and configurable authorization. |
| **P4 — UX & breadth** | 24, 26, 27 | Inventory/capability UX, API parity, user-lifecycle compliance. |
| **P5 — large standalone** | 25 | Diagramming: high effort; schedule when a dedicated block is available. |

## Effort summary (indicative)

| Phase | Steps | Rough size |
|---|---|---|
| 18 Meta-model foundation | 6 | ~1 large block |
| 19 View foundation | 3 | ~0.5 block |
| 20 Calc/cost/metrics | 4 | ~1 block |
| 21 Data collection/governance | 7 | ~1 block |
| 22 Reports & dashboards | 6 | ~1.5 blocks |
| 23 Authorization | 3 | ~0.5 block |
| 24 Inventory/cap-map UX | 4 | ~0.75 block |
| 25 Diagramming | 3 | ~1 block |
| 26 API parity | 4 | ~1 block |
| 27 User lifecycle | 3 | ~0.5 block |

> These close the **core** LeanIX gaps. Full LeanIX feature parity additionally requires PLANV4 Phases 14–17 (SSO/SCIM, automations, transformations, connectors/discovery, AI, portals, multi-tenancy), which remain the right home for those advanced capabilities.

---

## Open questions for review

1. **Target parity level** — is the goal broad LeanIX-equivalence (do most of 18–27), or a focused subset (e.g. only P1+P2: configurable model + reports/dashboards + cost)?
2. **Meta-model configurability vs. fixed model** — 18 is the biggest investment. If VantageMap's 12-type model is considered sufficient for the target market, we could skip custom *types* (18.2) while still doing custom *fields* (18.1) — a much smaller effort that still unlocks cost, calculations, and completion scoring.
3. **Diagramming (25)** — build vs. embed an OSS canvas (e.g. a mxgraph/tldraw-style library) vs. defer.
4. **Sequencing** — proceed strictly foundation-first (18→19→22), or deliver a visible quick win first (e.g. ADRs 21.6, milestones 21.7, @mentions UI 21.5, externalId 18.3) to show progress?
