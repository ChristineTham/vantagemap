# Phase 0 Implementation Artifacts

This folder contains execution artifacts for Phase 0: Program Setup and Parity Baseline.

## Objective

Translate product and platform requirements from the documentation corpus into:

- Traceable requirements with ownership, scope tags, and plan step mappings
- Actionable epics by bounded context, cross-referenced to PLAN.md steps
- Measurable non-functional targets
- An execution plan optimized for vibe coding
- Implementation gates for Phase 1 readiness

## Artifact Index

| Artifact                                                             | Purpose                                                                     | Status    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------- |
| [traceability-matrix.csv](traceability-matrix.csv)                   | Requirement-to-epic-to-plan-step mapping with MVP/Post-MVP tags             | Updated   |
| [epic-catalog.md](epic-catalog.md)                                   | Epic definitions grouped by bounded context with plan step cross-references | Updated   |
| [mvp-sprint-plan.md](mvp-sprint-plan.md)                             | Phase-sequenced execution plan with parallel tracks for vibe coding         | Updated   |
| [nfr.md](nfr.md)                                                     | Non-functional requirements and validation methods                          | Unchanged |
| [acceptance-criteria-templates.md](acceptance-criteria-templates.md) | Reusable Given/When/Then templates for UI, API, integration, and NFR checks | Unchanged |
| [migration-plan.md](migration-plan.md)                               | Data source cutover strategy aligned with backend-first build approach      | Updated   |
| [security-rbac.md](security-rbac.md)                                 | Role-operation matrix and security validation expectations                  | Unchanged |
| [gates.md](gates.md)                                                 | Phase 0 completion gates (7 gates)                                          | Updated   |

### OpenAPI Templates

| Template                                                                           | Purpose                           |
| ---------------------------------------------------------------------------------- | --------------------------------- |
| [../openapi-templates/facts-crud.yaml](../openapi-templates/facts-crud.yaml)       | Document CRUD API skeleton      |
| [../openapi-templates/search.yaml](../openapi-templates/search.yaml)               | Search API skeleton               |
| [../openapi-templates/relationships.yaml](../openapi-templates/relationships.yaml) | Relationship API skeleton         |
| [../openapi-templates/auth.yaml](../openapi-templates/auth.yaml)                   | Auth token API skeleton           |
| [../openapi-templates/webhooks.yaml](../openapi-templates/webhooks.yaml)           | Webhook subscription API skeleton |

## Source Corpus

- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../MODEL.md](../MODEL.md)
- [../ADMIN.md](../ADMIN.md)
- [../UAM.md](../UAM.md)
- [../DEVELOPER.md](../DEVELOPER.md)
- [../USER-GUIDE.md](../USER-GUIDE.md)
- [../USE-CASES.md](../USE-CASES.md)
- [../GETTING-STARTED.md](../GETTING-STARTED.md)

## Revision History

- **v3 (2026-05-12)**: Added zero-cost deployment and open-source-first constraints. Added REQ-071 through REQ-073 for deployment constraints. Updated EP-TECHSTACK-001 and EP-ID-003 readiness notes.
- **v2 (2026-05-12)**: Aligned all artifacts with revised PLAN.md (16-phase step-based structure). Added `plan_steps` column to traceability matrix. Added plan step cross-references to all epics. Rewrote sprint plan as phase-sequenced execution plan for vibe coding. Updated migration plan for backend-first approach. Added Gate 7 (execution plan readiness). Added 10 new requirements (REQ-061 through REQ-070) covering frontend, tech stack, data quality, and adoption metrics. Added 5 new epics (EP-TECHSTACK-001, EP-FRONTEND-001/002/003, EP-PORTAL-001, EP-CONNECTOR-001). Promoted REQ-037 (Provider), REQ-047 (6R), REQ-050 (obsolescence risk) from Post-MVP to MVP scope.
- **v1 (initial)**: Baseline artifacts from original 10-phase plan.

## Status

**Phase 0: Complete.** All 7 gates pass.  
**Phase 1: Complete.** 8 ADRs produced in `docs/adr/`. Ready for Phase 2 (Project Bootstrap).

## Next Step

Begin **Phase 2 — Project Bootstrap** by executing step 2.1 (Initialize Next.js project), then parallelize steps 2.2–2.6.
