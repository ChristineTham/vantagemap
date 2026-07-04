# Phase 0 Non-Functional Requirements

This document defines measurable quality targets required before Phase 1 implementation scales.

## 1) Performance

- API read latency: p95 under 250 ms, p99 under 600 ms for standard inventory reads
- API write latency: p95 under 400 ms for core document mutations
- Search latency: p95 under 300 ms for indexed filters at baseline dataset size
- Report latency: p95 under 5 s for standard dashboard/report workloads
- Webhook dispatch: median under 3 s from event commit to first delivery attempt

Validation

- Synthetic load tests for API and search routes
- Query profiling for top 10 critical endpoints
- Report generation timing in representative datasets

## 2) Reliability

- Service availability target: 99.5 percent monthly during MVP
- Background job success rate: at least 99 percent with automatic retries
- Backup RPO: 24 hours
- Recovery RTO: 4 hours for complete service restoration
- Event delivery durability: no acknowledged event loss across retry cycles

Validation

- Failure injection tests for queue and webhook delivery
- Backup restore drill at least once per release cycle
- Error budget tracking with incident postmortems

## 3) Scalability

- Concurrent users: baseline support for 1,000 active users
- Entity volume: baseline support for 100,000 documents and 500,000 relations
- Audit volume: support 1,000,000 audit entries without query timeout in admin views
- Pagination policy: required for all list endpoints over 200 records

Validation

- Load profile with concurrent user simulation
- Data-scale benchmark against synthetic high-volume dataset
- Storage and index growth monitoring thresholds

## 4) Security and Access Control

- RBAC enforcement: 100 percent of mutation endpoints enforce permission checks
- Token policy: access tokens short-lived, revocable, and audit-logged
- Secrets handling: no plaintext credential storage in repo or runtime logs
- Tenant/workspace isolation: no cross-workspace data visibility in any query path

Validation

- Security test suite for authorization bypass attempts
- Token lifecycle tests including revocation and expiry scenarios
- Static secret scan on code and config changes

## 5) Auditability and Governance

- Mutation audit coverage: all create/update/delete operations recorded
- Audit event fields: actor, timestamp, operation, target type, target ID, diff summary
- Audit retrieval latency: p95 under 1 s for standard filters in admin tooling
- Retention baseline: minimum 12 months for audit entries unless policy override applies

Validation

- End-to-end mutation test assertions on audit event creation
- Admin query tests across date, actor, and entity filters
- Retention policy checks in scheduled maintenance jobs

## 6) Operability and Observability

- Structured logs on all service boundaries
- Distributed tracing across API, persistence, and async jobs
- Alerting thresholds defined for latency, error rate, queue backlog, and webhook failures
- Runbook coverage for top 5 operational incidents

Validation

- Dashboard review in pre-release gate
- Alert fire-drill verification each milestone
- On-call handoff readiness review before MVP release
