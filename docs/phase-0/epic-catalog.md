# Phase 0 Epic Catalog

This catalog defines implementation epics grouped by bounded context, cross-referenced to the step-based execution plan in [PLAN.md](../PLAN.md).

## Tech Stack and Bootstrap

### EP-TECHSTACK-001 Tech Stack Evaluation and ADRs

- Scope: MVP
- Plan steps: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9
- Outcome: documented architecture decision records for database, ORM, auth, API layer, async processing, search, hosting, and observability
- Dependencies: none
- Acceptance criteria IDs: AC-TECH-001, AC-TECH-002
- Owner: Architecture
- Target milestone: M0 Decisions
- Accountable owner: Christine Tham (interim)
- Readiness notes: all ADRs must be finalized before project bootstrap begins. Evaluations must include open-source status and free-tier availability as scoring criteria per AGENTS.md deployment constraints.

## Platform Foundation

### EP-PLATFORM-001 Project Bootstrap and Managed Baseline

- Scope: MVP
- Plan steps: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
- Outcome: initialized Next.js 16 project with TypeScript, Tailwind CSS v4, database connection, CI pipeline, testing framework, and environment configuration
- Dependencies: EP-TECHSTACK-001
- Acceptance criteria IDs: AC-PLATFORM-001, AC-PLATFORM-002, AC-PLATFORM-003, AC-PLATFORM-004, AC-PLATFORM-005, AC-PLATFORM-006
- Owner: Architecture
- Target milestone: M1 Foundation
- Accountable owner: Christine Tham (interim)
- Readiness notes: must complete before schema, API, and frontend work begins

### EP-PLATFORM-002 Static-to-Persistent Data Migration

- Scope: MVP
- Plan steps: 3.9, 7.2
- Outcome: seed data populates database from static fixtures; API client supports feature-flag toggle between static and API data sources
- Dependencies: EP-PLATFORM-001, EP-MODEL-001
- Acceptance criteria IDs: AC-PLATFORM-010, AC-PLATFORM-011, AC-PLATFORM-012, AC-PLATFORM-013
- Owner: Architecture
- Target milestone: M2 Data Cutover
- Accountable owner: Christine Tham (interim)
- Readiness notes: use feature-flag cutover and rollback path per module

### EP-PLATFORM-003 Async Processing Runtime

- Scope: MVP
- Plan steps: 4.6 (feature flags), cross-cutting
- Outcome: queue-backed processing for imports, exports, connector jobs, and report generation
- Dependencies: EP-PLATFORM-001
- Acceptance criteria IDs: AC-PLATFORM-020, AC-PLATFORM-021, AC-PLATFORM-022
- Owner: Platform
- Target milestone: M2 Data Cutover
- Accountable owner: Christine Tham (interim)
- Readiness notes: required before large import workflows and webhook retry scaling

### EP-PLATFORM-004 Backup and Recovery Controls

- Scope: MVP
- Plan steps: cross-cutting
- Outcome: backup, restore, and migration safety procedures with operational runbooks
- Dependencies: EP-PLATFORM-001
- Acceptance criteria IDs: AC-PLATFORM-030, AC-PLATFORM-031, AC-PLATFORM-032
- Owner: Operations
- Target milestone: M3 Hardening
- Accountable owner: Christine Tham (interim)
- Readiness notes: must pass pre-release reliability gate

## Identity and Access

### EP-ID-001 Role-Based Access and Permission Evaluation

- Scope: MVP
- Plan steps: 3.8, 4.2, 4.3, 10.1, 10.2, 10.3, 10.5
- Outcome: user tables, authentication middleware, RBAC permission checks, user registration/login, user admin UI, role assignment UI
- Dependencies: EP-PLATFORM-001
- Acceptance criteria IDs: AC-ID-001, AC-ID-002, AC-ID-003, AC-ID-004, AC-ID-005, AC-ID-006, AC-ID-030, AC-ID-031
- Owner: Security
- Target milestone: M2 Data Cutover
- Accountable owner: Christine Tham (interim)
- Readiness notes: baseline for all mutation APIs and admin workflows

### EP-ID-002 Technical Users and Token Lifecycle

- Scope: MVP
- Plan steps: 10.4
- Outcome: technical user provisioning, token issuance/rotation/revocation, audit logs
- Dependencies: EP-ID-001
- Acceptance criteria IDs: AC-ID-010, AC-ID-011, AC-ID-012, AC-ID-013
- Owner: Security
- Target milestone: M2 Data Cutover
- Accountable owner: Christine Tham (interim)
- Readiness notes: required for integration endpoints and automation service calls

### EP-ID-003 SAML SSO and SCIM Sync

- Scope: Post-MVP
- Plan steps: 14.1, 14.2, 14.3, 14.4
- Outcome: enterprise identity federation, user lifecycle synchronization, custom roles, and virtual workspaces
- Dependencies: EP-ID-001
- Acceptance criteria IDs: AC-ID-020, AC-ID-021, AC-ID-022, AC-ID-023
- Owner: Security
- Target milestone: M4 Enterprise Expansion
- Readiness notes: pull into MVP only if pilot requires federated identity. Prefer open-source identity providers (Keycloak, Authentik) over commercial SSO SaaS. SAML library should be open-source.

## Meta Model and Documents

### EP-MODEL-001 Database Schema and Domain Models

- Scope: MVP
- Plan steps: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
- Outcome: all document tables (business architecture, application/data, strategy/planning, technology), relationship edge tables, tags/subscriptions, audit log, and user/role tables implemented as database schema with typed ORM models
- Dependencies: EP-PLATFORM-001
- Acceptance criteria IDs: AC-MODEL-001, AC-MODEL-002, AC-MODEL-003, AC-MODEL-004, AC-MODEL-005, AC-MODEL-006, AC-MODEL-007, AC-MODEL-008, AC-MODEL-009, AC-MODEL-010, AC-MODEL-011, AC-MODEL-012, AC-MODEL-013, AC-MODEL-014, AC-MODEL-015, AC-MODEL-016, AC-MODEL-017, AC-MODEL-018, AC-MODEL-030, AC-MODEL-031
- Owner: Architecture
- Target milestone: M1 Foundation
- Accountable owner: Christine Tham (interim)
- Readiness notes: align strictly with MODEL.md; all 12+1 document types covered

### EP-MODEL-002 Custom Field Extension Governance

- Scope: Post-MVP
- Plan steps: 3.6 (JSONB column exists at MVP; governance rules are Post-MVP)
- Outcome: governed custom fields and validation for extensible domain modeling
- Dependencies: EP-MODEL-001
- Acceptance criteria IDs: AC-MODEL-040, AC-MODEL-041
- Owner: Architecture
- Target milestone: M4 Enterprise Expansion
- Readiness notes: implement only after baseline model stability

### EP-FACT-001 Entity CRUD APIs

- Scope: MVP
- Plan steps: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10
- Outcome: API foundation (route patterns, auth, RBAC, audit, pagination) plus full REST CRUD for all 10 entity types with permission checks and audit logging
- Dependencies: EP-MODEL-001, EP-ID-001
- Acceptance criteria IDs: AC-FACT-001, AC-FACT-002, AC-FACT-003, AC-FACT-004, AC-FACT-005, AC-FACT-006
- Owner: Product
- Target milestone: M2 Data Cutover
- Accountable owner: Christine Tham (interim)
- Readiness notes: base inventory functionality for all product views; all 10 entity APIs parallelizable

### EP-FACT-002 Relationship, Search, and Filtering

- Scope: MVP
- Plan steps: 6.1, 6.2, 6.3
- Outcome: relationship CRUD, cross-entity search with p95 <300 ms, faceted filtering
- Dependencies: EP-FACT-001
- Acceptance criteria IDs: AC-FACT-010, AC-FACT-011, AC-FACT-012, AC-FACT-013
- Owner: Product
- Target milestone: M2 Data Cutover
- Accountable owner: Christine Tham (interim)
- Readiness notes: include pagination and index strategy in design

### EP-FACT-003 Bulk Data Operations

- Scope: MVP
- Plan steps: 6.4, 9.5, 12.4, 12.5
- Outcome: bulk update, import (CSV/Excel), and export workflows for inventory management
- Dependencies: EP-FACT-001, EP-INT-001
- Acceptance criteria IDs: AC-FACT-020, AC-FACT-021, AC-FACT-022
- Owner: Product
- Target milestone: M3 Hardening
- Accountable owner: Christine Tham (interim)
- Readiness notes: enforce validation and partial-failure reporting

## Frontend

### EP-FRONTEND-001 Application Shell and Shared Components

- Scope: MVP
- Plan steps: 7.1, 7.2, 7.3, 7.4
- Outcome: app layout with Sidebar navigation, API client with feature-flag data source toggle, reusable UI component library (Card, DataTable, StatusBadge, etc.), error/loading patterns
- Dependencies: EP-PLATFORM-001
- Acceptance criteria IDs: AC-FRONT-001, AC-FRONT-002
- Owner: Product
- Target milestone: M2 Data Cutover
- Accountable owner: Christine Tham (interim)
- Readiness notes: can start with static fixtures while APIs are built in parallel

### EP-FRONTEND-002 Core Views

- Scope: MVP
- Plan steps: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
- Outcome: six route views (Dashboard, Capabilities, Applications, Strategy, Radar, Roadmap) consuming API data via shared components
- Dependencies: EP-FRONTEND-001, EP-FACT-001 (at least partial)
- Acceptance criteria IDs: AC-FRONT-010, AC-FRONT-011, AC-FRONT-012, AC-FRONT-013, AC-FRONT-014, AC-FRONT-015
- Owner: Product
- Target milestone: M2 Data Cutover
- Accountable owner: Christine Tham (interim)
- Readiness notes: all six views parallelizable; follow add-page SKILL checklist

### EP-FRONTEND-003 CRUD and Editing UI

- Scope: MVP
- Plan steps: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
- Outcome: document detail view, create/edit forms, relationship editor, bulk edit UI, search/filter UI
- Dependencies: EP-FRONTEND-002, EP-FACT-001, EP-FACT-002
- Acceptance criteria IDs: AC-FRONT-020, AC-FRONT-021, AC-FRONT-022
- Owner: Product
- Target milestone: M3 Hardening
- Accountable owner: Christine Tham (interim)
- Readiness notes: Client Components with "use client" for interactive forms

## Admin and Governance

### EP-ADMIN-001 Governance Controls and Subscriptions

- Scope: MVP
- Plan steps: 11.1, 11.2
- Outcome: tagging system with configurable modes, subscription/ownership model per document
- Dependencies: EP-ID-001, EP-FACT-001
- Acceptance criteria IDs: AC-ADMIN-001, AC-ADMIN-002, AC-ADMIN-003, AC-ADMIN-004, AC-ADMIN-005, AC-ADMIN-006
- Owner: Operations
- Target milestone: M3 Hardening
- Accountable owner: Christine Tham (interim)
- Readiness notes: required for enterprise onboarding and governance parity

### EP-ADMIN-002 Quality Seal Workflow

- Scope: MVP
- Plan steps: 11.3
- Outcome: quality seal states (Draft/Check Needed/Approved/Rejected), review workflow, renewal intervals, notification behavior
- Dependencies: EP-ADMIN-001, EP-ID-001
- Acceptance criteria IDs: AC-ADMIN-010, AC-ADMIN-011, AC-ADMIN-012
- Owner: Operations
- Target milestone: M3 Hardening
- Accountable owner: Christine Tham (interim)
- Readiness notes: integrate with subscriptions and audit logs

### EP-SEC-001 Audit Trail and Compliance Logging

- Scope: MVP
- Plan steps: 3.7, 4.4
- Outcome: immutable audit log table with middleware for automatic capture on all mutations; queryable admin views
- Dependencies: EP-PLATFORM-001
- Acceptance criteria IDs: AC-SEC-001, AC-SEC-002, AC-SEC-003, AC-SEC-004
- Owner: Security
- Target milestone: M1 Foundation (schema), M2 Data Cutover (middleware)
- Accountable owner: Christine Tham (interim)
- Readiness notes: must be integrated across API and background job paths

## Integrations and APIs

### EP-INT-001 REST API and OpenAPI Documentation

- Scope: MVP
- Plan steps: 5.1–5.10 (entity APIs), 12.1 (OpenAPI docs)
- Outcome: REST endpoints for all entity types with auto-generated OpenAPI 3.1 specification and interactive explorer
- Dependencies: EP-PLATFORM-001, EP-MODEL-001
- Acceptance criteria IDs: AC-INT-001, AC-INT-002, AC-INT-003, AC-INT-004, AC-INT-050, AC-INT-051, AC-INT-052, AC-INT-053
- Owner: Platform
- Target milestone: M2 Data Cutover
- Accountable owner: Christine Tham (interim)
- Readiness notes: publish OpenAPI contracts early

### EP-INT-002 GraphQL Reporting Access

- Scope: MVP
- Plan steps: 12.2
- Outcome: GraphQL endpoint for report-friendly and relationship-centric querying with pagination and complexity limits
- Dependencies: EP-FACT-001, EP-FACT-002
- Acceptance criteria IDs: AC-INT-010, AC-INT-011, AC-INT-012, AC-INT-013
- Owner: Platform
- Target milestone: M3 Hardening
- Accountable owner: Christine Tham (interim)
- Readiness notes: align schema with canonical model, enforce RBAC

### EP-INT-003 Webhooks and Delivery Reliability

- Scope: MVP
- Plan steps: 12.3
- Outcome: event subscriptions, retries, dead-letter handling, delivery logs
- Dependencies: EP-FACT-001
- Acceptance criteria IDs: AC-INT-020, AC-INT-021, AC-INT-022, AC-INT-023
- Owner: Platform
- Target milestone: M3 Hardening
- Accountable owner: Christine Tham (interim)
- Readiness notes: include idempotency keys and replay safety

### EP-INT-004 MCP Integration Surface

- Scope: Post-MVP
- Plan steps: 15.3
- Outcome: MCP endpoint with scoped tools, identity checks, and audit coverage
- Dependencies: EP-ID-002, EP-INT-001
- Acceptance criteria IDs: AC-INT-040, AC-INT-041
- Owner: Platform
- Target milestone: M4 Enterprise Expansion
- Readiness notes: introduce after core API governance is stable

## Reporting and Strategy Use Cases

### EP-REPORT-001 Core Reporting Runtime and Dashboard

- Scope: MVP
- Plan steps: 8.1, 13.1, 13.6, 13.7
- Outcome: reporting data pipeline, dashboard view, data quality metrics, adoption metrics
- Dependencies: EP-FACT-001, EP-FRONTEND-001
- Acceptance criteria IDs: AC-REPORT-001, AC-REPORT-002, AC-REPORT-003, AC-REPORT-004, AC-REPORT-060, AC-REPORT-061, AC-REPORT-070, AC-REPORT-071
- Owner: Product
- Target milestone: M3 Hardening
- Accountable owner: Christine Tham (interim)
- Readiness notes: establish report query guardrails and export baseline

### EP-REPORT-002 Application Rationalization Use Case

- Scope: MVP
- Plan steps: 13.2
- Outcome: TIME classification engine with dashboard widget and drill-down
- Dependencies: EP-REPORT-001, EP-FACT-002
- Acceptance criteria IDs: AC-REPORT-010, AC-REPORT-011, AC-REPORT-012, AC-REPORT-013
- Owner: Product
- Target milestone: M3 Hardening
- Accountable owner: Christine Tham (interim)
- Readiness notes: tune for transparency and explainability of scoring

### EP-REPORT-003 6R and Modernization Analytics

- Scope: MVP (6R classification); Post-MVP (pace-layering)
- Plan steps: 13.3
- Outcome: 6R classification per application with dashboard widget; pace-layering analysis deferred
- Dependencies: EP-REPORT-002
- Acceptance criteria IDs: AC-REPORT-030, AC-REPORT-031, AC-REPORT-032, AC-REPORT-033
- Owner: Product
- Target milestone: M3 Hardening (6R), M4 Enterprise Expansion (pace-layering)
- Accountable owner: Christine Tham (interim)

### EP-REPORT-004 Obsolescence Risk Analytics

- Scope: MVP
- Plan steps: 13.4
- Outcome: lifecycle risk identification, risk score calculation, alert dashboard for approaching end-of-life
- Dependencies: EP-REPORT-001, EP-FACT-002
- Acceptance criteria IDs: AC-REPORT-040, AC-REPORT-041
- Owner: Product
- Target milestone: M3 Hardening
- Accountable owner: Christine Tham (interim)

### EP-REPORT-005 AI Governance Analytics

- Scope: Post-MVP
- Plan steps: 15.7
- Outcome: AI adoption and governance metrics linked to domain inventory
- Dependencies: EP-REPORT-001, EP-MODEL-001
- Acceptance criteria IDs: AC-REPORT-050, AC-REPORT-051
- Owner: Product
- Target milestone: M4 Enterprise Expansion

### EP-ROADMAP-001 Strategic Roadmap and Impact Analysis

- Scope: MVP
- Plan steps: 5.4, 8.6, 13.5
- Outcome: initiative API, roadmap Gantt view, impact analysis showing affected capabilities/applications per initiative
- Dependencies: EP-FACT-001
- Acceptance criteria IDs: AC-ROADMAP-001, AC-ROADMAP-002, AC-ROADMAP-003
- Owner: Product
- Target milestone: M3 Hardening
- Accountable owner: Christine Tham (interim)
- Readiness notes: preserve existing roadmap route while replacing static data

## Collaboration (Post-MVP)

### EP-COLLAB-001 Comments, To-Dos, and Surveys

- Scope: Post-MVP
- Plan steps: 11.4, 11.5, 11.6
- Outcome: comments with threaded replies, to-do task tracking, survey framework for stakeholder data collection
- Dependencies: EP-FACT-001, EP-ID-001
- Acceptance criteria IDs: AC-COLLAB-001, AC-COLLAB-002, AC-COLLAB-010, AC-COLLAB-011
- Owner: Product
- Target milestone: M4 Enterprise Expansion

## Post-MVP Expansion

### EP-AUTO-001 Advanced Automation Orchestration

- Scope: Post-MVP
- Plan steps: 15.1
- Outcome: no-code event-condition-action workflows with admin rule builder
- Dependencies: EP-INT-003, EP-ID-002
- Acceptance criteria IDs: AC-AUTO-001, AC-AUTO-002
- Owner: Platform
- Target milestone: M4 Enterprise Expansion

### EP-TRANSFORM-001 Transformation Scenario Engine

- Scope: Post-MVP
- Plan steps: 15.2
- Outcome: scenario comparison, rollback planning, and transformation templates
- Dependencies: EP-ROADMAP-001, EP-REPORT-001
- Acceptance criteria IDs: AC-TRANSFORM-001, AC-TRANSFORM-002, AC-TRANSFORM-003, AC-TRANSFORM-004
- Owner: Product
- Target milestone: M4 Enterprise Expansion

### EP-PORTAL-001 External Portal

- Scope: Post-MVP
- Plan steps: 15.5
- Outcome: read-only portal view of selected documents and reports with configurable visibility
- Dependencies: EP-FRONTEND-002
- Acceptance criteria IDs: AC-PORTAL-001, AC-PORTAL-002
- Owner: Product
- Target milestone: M4 Enterprise Expansion

### EP-CONNECTOR-001 Connector Catalog

- Scope: Post-MVP
- Plan steps: 15.6
- Outcome: pre-built integration connectors for ServiceNow, Jira, Azure AD, AWS with scheduled sync
- Dependencies: EP-INT-003, EP-FACT-003
- Acceptance criteria IDs: AC-CONNECTOR-001, AC-CONNECTOR-002
- Owner: Platform
- Target milestone: M4 Enterprise Expansion
