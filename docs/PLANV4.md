# Plan V2: VantageMap Post-MVP Roadmap

This document contains the post-MVP roadmap for VantageMap, covering enterprise identity, advanced features, and platform enhancements planned after the V1 (MVP) release.

For the V1 (MVP) plan covering Phases 0–13 (all complete), see [PLAN.md](PLAN.md).

---

## Execution Model

Same principles as V1:

- **Vibe coding**: every step is scoped for a single AI coding session.
- **Backend → frontend**: persistence and APIs before UI.
- **Parallel by default**: steps within a phase have no implicit ordering unless noted.
- **Incremental delivery**: each step produces working, testable, deployable output.
- **Instruction alignment**: all steps follow [AGENTS.md](../AGENTS.md) and `.github/instructions/`.

---

## Phase 14 — Enterprise Identity

Enterprise SSO and provisioning from [UAM.md](UAM.md). Deferred from MVP unless required by pilot customers.

| Step | Title                      | Scope                                                                                                                                                        | Depends on |
| ---- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 14.1 | SAML 2.0 SSO               | SP-initiated SAML flow. IdP metadata configuration UI. JIT user provisioning on first login. Attribute mapping (firstname, lastname, email, uid, role).      | 10.1, 4.2  |
| 14.2 | SCIM provisioning          | SCIM 2.0 endpoint for user lifecycle sync (create, update, deactivate). Attribute mapping for role, department, ACE. Workspace-specific configuration.       | 14.1       |
| 14.3 | IdP-managed custom roles   | Receive custom role claims from IdP. Map to permission sets. Standard role precedence rules. Multiple role aggregation.                                      | 14.1, 4.3  |
| 14.4 | Virtual workspaces and ACL | Access Control Entities (ACE) for fact sheet scoping. Virtual workspace views with filtered fact sheet visibility. ACL defaults for new vs existing records. | 14.3, 10.5 |

---

## Phase 15 — Advanced Features

Advanced capabilities from [ADMIN.md](ADMIN.md), [USE-CASES.md](USE-CASES.md), and [DEVELOPER.md](DEVELOPER.md). All steps are independent.

| Step | Title                         | Scope                                                                                                                                                                      | Depends on       |
| ---- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 15.1 | Automation framework          | No-code event-condition-action workflows. Trigger on fact sheet changes. Actions: update fields, send notifications, create tasks. Admin UI for rule builder.              | Phase 5, 12.3    |
| 15.2 | Transformation scenarios      | Scenario modeling with baseline and target states. Predefined templates (cloud migration, org restructure). Side-by-side comparison view. Rollback support.                | Phase 5, Phase 8 |
| 15.3 | MCP server for AI integration | MCP-compatible endpoint exposing fact sheet tools for AI clients. Permission-scoped tool visibility. Query limits (max 10 values). Reference [DEVELOPER.md](DEVELOPER.md). | Phase 5, 4.3     |
| 15.4 | AI-powered recommendations    | AI-assisted description generation for fact sheets. Relationship suggestions based on existing patterns. Natural language search/filtering.                                | 6.2, 9.1         |
| 15.5 | Portal for external audiences | Read-only portal view of selected fact sheets and reports. Configurable visibility scope. Branding and theming. No authentication required for portal consumers.           | Phase 8, 4.6     |
| 15.6 | Connector catalog             | Pre-built integration connectors for common data sources (ServiceNow, Jira, Azure AD, AWS). Connector configuration UI. Scheduled sync with conflict resolution.           | 12.3, 12.4       |
| 15.7 | AI governance use case        | AI policy and ethics tracking. AI Agent fact sheet subtype management. Risk and compliance scoring for AI initiatives. Reference [USE-CASES.md](USE-CASES.md).             | 5.2, 13.4        |

---

## Phase 16 — Platform Hardening (Planned)

Production readiness and enterprise-grade operational requirements.

| Step | Title                          | Scope                                                                                                                                     | Depends on  |
| ---- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 16.1 | Load testing and tuning        | K6 or Artillery load tests targeting NFR thresholds (p95 <250ms read, <400ms write). Database query optimization. Connection pool tuning. | Phase 13    |
| 16.2 | End-to-end test suite          | Playwright E2E tests for critical user flows: login, CRUD, search, bulk operations, admin workflows.                                      | Phase 10–13 |
| 16.3 | Observability production setup | Sentry project config, Pino → log aggregator pipeline, OpenTelemetry traces, alerting rules for error rate and latency.                   | ADR-008     |
| 16.4 | Azure deployment pipeline      | Azure App Service deployment config, managed PostgreSQL migration from Neon, GitHub Actions CD pipeline, staging environment.             | ADR-007     |
| 16.5 | Backup and disaster recovery   | Automated database backups (24h RPO), point-in-time recovery, tested restore runbook (4h RTO target).                                     | Phase 3     |
| 16.6 | Security hardening             | Dependency vulnerability scanning (Snyk/GitHub Dependabot), CSRF protection review, rate limiting tuning, penetration test checklist.     | Phase 10    |
| 16.7 | Internationalization (i18n)    | Extract all user-facing strings. Set up next-intl or similar. Initial locale: English. Structure for adding locales without code changes. | Phase 8     |

---

## Phase 17 — Multi-Tenancy and Scale (Planned)

Enterprise multi-tenant capabilities for SaaS deployment.

| Step | Title                         | Scope                                                                                                                       | Depends on |
| ---- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 17.1 | Workspace isolation           | Full tenant isolation at database level (row-level security or schema-per-tenant). Data leak prevention between workspaces. | 14.4       |
| 17.2 | Usage metering and billing    | Track API calls, storage, users per workspace. Usage dashboard for admins. Integration hooks for billing systems.           | Phase 12   |
| 17.3 | White-label and theming       | Per-workspace branding (logo, colors, custom domain). Theme configuration UI. CSS variable override system.                 | 15.5       |
| 17.4 | Data residency and compliance | Regional database placement options. Data export for GDPR requests. Audit trail for compliance reporting.                   | 16.5       |

---

## Dependency Graph (V2)

```
V1 MVP Complete (Phases 0–13)
  └→ Phase 14 (Enterprise Identity)
       └→ Phase 17 (Multi-Tenancy)
  └→ Phase 15 (Advanced Features) — independent steps
  └→ Phase 16 (Platform Hardening) — independent steps
       └→ Phase 17.4 (Compliance)
```

---

## Prioritization Guidance

| Priority | Phases | Trigger                                        |
| -------- | ------ | ---------------------------------------------- |
| P1       | 16     | Before production deployment to first customer |
| P2       | 14     | When enterprise customer requires SSO/SCIM     |
| P3       | 15     | Feature requests from pilot users              |
| P4       | 17     | When SaaS model is validated                   |

---

## Cross-Cutting Concerns (Continuous from V1)

These remain active throughout V2 development:

| Concern             | Scope                                                                               |
| ------------------- | ----------------------------------------------------------------------------------- |
| Observability       | Structured logging, distributed tracing, error tracking, alerting                   |
| Performance         | API p95 <250 ms (read), <400 ms (write). Pagination. Query budgets. Cache strategy. |
| Security            | Secret management, input validation, CSRF, rate limiting, dependency scanning       |
| Reliability         | 99.5% availability, idempotent writes, backup/restore (24h RPO, 4h RTO)             |
| Instruction updates | Keep `.github/instructions/` and `.github/skills/` accurate for new phases          |
| Testing             | Unit, integration, and E2E tests. Every step includes tests.                        |
