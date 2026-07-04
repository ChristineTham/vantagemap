# VantageMap vs SAP LeanIX — Gap Report

**Date:** 2026-07-04
**Method:** Full per-document review of all 16 SAP LeanIX PDFs in [docs/pdf/](pdf/) (~2,400 pages) against the VantageMap V1 implementation. One reviewer per document extracted every LeanIX feature, classified it **Equivalent / Partial / Missing / Deferred**, and verified each classification against the actual source in `src/`. Advanced capabilities already on the post-MVP roadmap ([PLANV4.md](PLANV4.md)) are recorded as **Deferred**, not gaps.

Companion document: **[LEANIX-IMPLEMENTATION-PLAN.md](LEANIX-IMPLEMENTATION-PLAN.md)** — proposed phased plan to close the core gaps.

---

## 1. Executive summary

**VantageMap reproduces LeanIX's data model and analytical frameworks closely, but implements only part of LeanIX's "authoring & experience" layer.**

- **Where it matches (≈ full parity):** the meta-model (all 12 fact sheet types + subtypes, including AI Agent / MCP Server / AI Model), typed & validated relationships, lifecycle/health, the Quality Seal state machine, tags, RACI subscriptions, comments, to-dos, audit log, TIME/6R/functional-technical-fit/business-criticality, obsolescence-risk and capability-coverage reporting, full-text search with saved searches, CSV/Excel import-export, email/password auth + sessions + API tokens, RBAC (Viewer/Member/Admin), and notifications. The four-step LeanIX EA methodology (goals → capability map → application inventory → data quality) is fully supported end-to-end.
- **Where it lags:** LeanIX is fundamentally a **configurable platform** — admins define fact sheet types, fields, relations, reports, dashboards, KPIs, calculations, and permissions from the UI. VantageMap fixes all of these in code. The largest gaps are therefore the **configuration/authoring surfaces** and the **visual experience layer**: no configurable report/view builder, no custom dashboards, no diagramming, no calculations engine, no meta-model configuration, no cost/TCO, and only basic (non-campaign) surveys.

**Overall assessment:** VantageMap is a faithful, well-architected implementation of the LeanIX *domain model and core EA workflows* (estimated ~45–55% of LeanIX's total surface for a mid-market EA tool), but not yet of LeanIX's *self-service configurability and rich visualisation*. None of the gaps are conceptual dead-ends — the data model is a sound foundation for all of them.

### Coverage by document

| Document (pp) | Domain | Verdict |
|---|---|---|
| metamodel (219) | Data model / meta-model | Data model ~1:1; configurability missing |
| userguide (424) | End-user features | ~40–50%; strong backbone, weak reports/diagrams/dashboards |
| aminguide (229) | Administration | Operational admin present; config surface (54 features, 18 missing) largely absent |
| developer (415) | API / SDK | REST/OpenAPI/webhooks at parity; GraphQL read-only; no Reporting SDK |
| uam (123) | User & access mgmt | Auth & standard roles solid; granular/configurable authz + GDPR lifecycle thin |
| usecases (147) | EA methodologies | Frameworks match; operational machinery (view builder, cost, calc) missing |
| discoveryintegrations (488) | Integrations | Connectors deferred (15.6); **externalId/ingestion primitives** genuinely missing |
| additional (135) | Add-on products (AI Hub, Risk, Roadmap) | Mostly deferred; milestones + risk roll-up are real gaps |
| bestpractices (54) | Contract/Cost/Target/Security | Governance primitives present; contract + cost + calculations missing |
| bestpractices-l3 (13) | Expert playbook | ADRs + Calculations + persona dashboards |
| whitepaper (30) | EA success kit | Concepts all present; gaps are visualisation/config |
| gettingstarted (26) | Onboarding | Foundations match; diagrams/reports/dashboards/campaigns missing |
| resources (17) | Legal/hosting/support | Mostly N/A; Teams (15.6), GDPR export (17.4) |
| consolidated-bp (3) | Maturity roll-up | L1/L2 strong; L3 config gaps |
| capability-map (1) | Reference BCM | Data model equivalent; interactive heatmap UX partial |
| poster (1) | EA methodology | All four steps at parity |

---

## 2. Consolidated core-gap register

Gaps are deduplicated across documents and grouped by theme. **Effort:** S (≤1 session), M (2–4 sessions), L (5+ sessions / a phase). "Seen in" lists the documents that raised the gap (evidence of how central it is).

### A. Meta-model configurability — *the dominant gap*
| Gap | Effort | Seen in |
|---|---|---|
| Custom fact sheet types (beyond the fixed 12) | L | metamodel, aminguide, userguide, usecases |
| Custom subtypes per type | L | metamodel, aminguide |
| Custom typed fields (per type/section, searchable/filterable, width, ACL) — today only a passive `customFields` jsonb | L | metamodel, aminguide, userguide, bestpractices |
| Custom relation types + multiplicity (35 types fixed in code) | L | metamodel, aminguide |
| Attributes/fields **on relations** (cost, usage type, CRUD, obsolescence status) | M | metamodel, usecases, bestpractices |
| Conditional attributes (activator logic) | L | aminguide |
| Rename types / colours / field order / translations | M | metamodel, aminguide |

### B. Configurable report & view builder — *largest experience gap*
| Gap | Effort | Seen in |
|---|---|---|
| Report engine with saved/shared **views**, cluster-by, drill-down, URL state (vs fixed hard-coded reports) | L | userguide, usecases, aminguide, whitepaper, gettingstarted |
| Landscape report (capability heat-map) | L | userguide, usecases |
| Matrix report | L | userguide, usecases |
| Portfolio (bubble) report with configurable axes/size | M | userguide, usecases |
| Circle Map (interface dependency) | M | userguide, usecases |
| Cost report / World map report | M | userguide, bestpractices |
| Report export (PDF / PNG / HTML) | M | userguide |
| Report collections | S | userguide, usecases |

### C. Custom dashboards
| Gap | Effort | Seen in |
|---|---|---|
| Panel/widget dashboard builder (drag/resize/copy) | L | userguide, aminguide, gettingstarted |
| Per-user / default / shared dashboards + permissions | M | userguide, aminguide |
| Global (cross-panel) dashboard filter | M | userguide |
| Executive / persona KPI dashboards with period comparison & KPI history | L | userguide, aminguide, bestpractices-l3, consolidated-bp |
| Favorites / "Add to Collection" | M | userguide |

### D. Diagramming — *entirely absent (own LeanIX nav tab)*
| Gap | Effort | Seen in |
|---|---|---|
| Free-draw diagrams (canvas editor) | L | userguide, gettingstarted, metamodel |
| Data-flow diagrams | L | userguide, usecases, whitepaper |
| Diagram templates, versioning, layers, permissions, collections | L | userguide |
| Visual dependency / impact analysis (Relations Explorer beyond a list) | M | usecases, whitepaper, additional |

### E. Calculations, cost & metrics
| Gap | Effort | Seen in |
|---|---|---|
| Calculations engine (user-defined derived fields; auto-derive TIME/6R from fit; roll-ups) | L | metamodel, usecases, aminguide, bestpractices, bestpractices-l3 |
| Cost / TCO fields (CapEx/OpEx on apps, components, initiatives) | M | usecases, bestpractices, metamodel |
| Metrics (time-series store + charts) | M | aminguide |
| Custom KPIs on dashboards (absolute/%, aggregations, historical) | L | aminguide, bestpractices, bestpractices-l3 |

### F. Data collection & collaboration depth
| Gap | Effort | Seen in |
|---|---|---|
| Survey **builder** (conditional/calculated questions) | L | userguide, usecases |
| Survey **campaigns** (send / schedule / remind / auto-merge responses to fact sheets) | L | userguide, usecases, gettingstarted, whitepaper, poster, consolidated-bp |
| Comment @mentions **UI** (backend already wired, no picker) | S | userguide, usecases |
| File attachments / Resources on fact sheets (files, links, logos) | M | userguide, usecases |
| Subscription named roles + **Contacts** (non-user subscribers) | M | usecases, uam, metamodel |
| Mandatory attributes (gate Quality Seal approval) | M | usecases, userguide, bestpractices |
| Completion score on fact-sheet header (weighted; today report-level only) | M | usecases, userguide, gettingstarted |
| Fact-sheet **verification** record, distinct from data-quality seal | M | additional |

### G. Roadmap, lifecycle & risk
| Gap | Effort | Seen in |
|---|---|---|
| **Milestones** on initiatives (discrete milestone entity) | M | additional, usecases, bestpractices |
| Roadmap dependency lines (Requires/Blocks rendered) + cluster/drill-down | M | additional, userguide, usecases |
| Obsolescence risk **roll-up** to applications via relations + %-views (Missing/Mitigated/Unaddressed) | L | additional, usecases |
| Point-in-time / lifecycle-phase filtering | M | userguide, usecases |
| Pace-layering & "scope" (in/out) fields | S | usecases |

### H. Architecture decisions
| Gap | Effort | Seen in |
|---|---|---|
| Architecture Decision (ADR) records + workflow — reusable via the Quality Seal state machine | M | userguide, usecases, additional, bestpractices-l3, consolidated-bp |

### I. Inventory & capability-map UX
| Gap | Effort | Seen in |
|---|---|---|
| Generic configurable Inventory grid (unified across types) with saved view configs, Manage Columns | M | userguide, usecases, gettingstarted |
| Inline table editing (cell edit, copy/paste/autofill) | L | userguide, usecases |
| Advanced boolean filters (AND/OR/NOT combinators) | M | userguide |
| Capability-map heat overlays by metric + coverage/duplication painted on map | M | capability-map, userguide |
| Capability-map collapse/expand/zoom/search at scale | M | capability-map |

### J. Authorization granularity
| Gap | Effort | Seen in |
|---|---|---|
| Admin-editable role permissions (RBAC is hardcoded; roles page is read-only) | L | uam, aminguide |
| Per-fact-sheet-type / per-attribute permissions | L | uam, aminguide |
| Subscription-based permission gating | M | uam |

### K. User lifecycle & compliance (non-SSO)
| Gap | Effort | Seen in |
|---|---|---|
| 90-day auto-deletion of archived users (GDPR) | M | uam |
| Self-service account deletion; user data export | S | uam, resources |
| PII change audit report | M | uam |
| Bulk invite; re-invite; admin-configurable default role | S | uam |
| MFA / 2FA (native, for non-SSO tenants) | M | uam |

### L. API & integration primitives
| Gap | Effort | Seen in |
|---|---|---|
| GraphQL **mutations** (LeanIX centres writes on GraphQL; VantageMap's is read-only) | L | developer |
| GraphQL facet filters + relay cursor pagination | M | developer |
| **externalId identity mapping** (bulk route declares `externalId` but discards it; no `external_id` column) | M | discoveryintegrations |
| Generic inbound ingestion / sync-run model (upsert-by-external-key, run history) — foundation for future connectors | L | discoveryintegrations |
| Webhook PULL mode + richer event catalog + per-target auth | M | developer |
| API rate limiting (429 / Retry-After) | M | developer |
| Custom Reports SDK (embeddable reporting API, scaffolding, upload) | L | developer |

---

## 3. Confirmed deferred (already on the PLANV4 roadmap — **not** counted as gaps)

These recurred throughout the LeanIX docs and are correctly out of V1 scope:

- **Enterprise identity (Phase 14):** SSO/SAML (six IdPs), SCIM provisioning, IdP-managed custom roles, virtual workspaces / ACL / ACE fact-sheet scoping.
- **Advanced features (Phase 15):** automation framework / no-code ECA workflows (15.1); transformation scenarios / target-state / impacts / transformations explorer (15.2); MCP server (15.3); AI recommendations, NL search, AI inventory builder, SAP Suggestions (15.4); external read-only portals (15.5); connector catalog & discovery — ServiceNow, Jira, Signavio, Collibra, Apptio, Azure/AWS, Cloud ALM, Teams, Lucidchart, Extension Hub, reference catalog, SBOM/self-built discovery (15.6); AI governance (15.7).
- **Hardening (Phase 16):** observability (16.3), i18n / multilingual (16.7).
- **Multi-tenancy & scale (Phase 17):** workspace data isolation (17.1), usage metering/billing (17.2), white-label/branding/theming (17.3), data residency / regional hosting / GDPR export tooling (17.4).

Note: two items the LeanIX docs treat as "advanced" are arguably **foundational** and were pulled out of the deferred set into the gap register above, because much else depends on them: **externalId identity mapping** (L-register item, prerequisite for any connector) and **attributes on relations** (needed for cost, CRUD, obsolescence-status modelling).

---

## 4. Notable "better-than-or-equal" points

- **Audit log:** VantageMap keeps a first-class immutable audit trail with field-level diffs; LeanIX exposes audit largely via support-only downloads.
- **AI-ready meta-model:** the AI Agent (application), MCP Server (interface), and AI Model (IT component) subtypes already exist in the schema, so AI-governance work (15.4/15.7) starts from a populated model.
- **Security posture:** after the production-readiness pass, VantageMap has CSP/HSTS, SSRF-guarded webhooks, RBAC-enforced APIs, and hashed API tokens — comparable to or ahead of what the LeanIX docs describe for a self-hosted equivalent.

---

## 5. Per-document findings

Full per-document tables (every feature, page-cited, code-verified) are preserved in **[leanix-findings/](leanix-findings/)** — one file per source document:
[metamodel](leanix-findings/metamodel.md) · [userguide](leanix-findings/userguide.md) · [aminguide](leanix-findings/aminguide.md) · [developer](leanix-findings/developer.md) · [uam](leanix-findings/uam.md) · [usecases](leanix-findings/usecases.md) · [discoveryintegrations](leanix-findings/discoveryintegrations.md) · [additional](leanix-findings/additional.md) · [bestpractices](leanix-findings/bestpractices.md) · [bestpractices-l3](leanix-findings/bestpractices-l3.md) · [whitepaper](leanix-findings/whitepaper.md) · [gettingstarted](leanix-findings/gettingstarted.md) · [resources](leanix-findings/resources.md) · [consolidated-bp](leanix-findings/consolidated-bp.md) · [capability-map](leanix-findings/capability-map.md) · [poster](leanix-findings/poster.md).
