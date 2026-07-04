/**
 * Database schema barrel — re-exports all entity tables and relations.
 *
 * Bounded contexts:
 *   enums.ts         — shared PostgreSQL enums
 *   documents.ts     — unified document meta-model (replaces the 12 per-type tables)
 *   strategy.ts      — KPIs + KPI history (sub-entities of documents)
 *   relationships.ts — generic edge table
 *   tags.ts          — TagGroup, Tag, TagAssignment, Subscription
 *   audit.ts         — AuditEntry
 *   users.ts         — User, Workspace, UserWorkspaceRole
 *   auth.ts          — Better Auth core tables (user, session, account, verification, rate_limit)
 *   api-tokens.ts    — API Tokens for technical users (Phase 10)
 *   governance.ts    — Comments, Todos, Surveys, QualitySealTransitions (Phase 11)
 */

export * from "./enums";
export * from "./strategy";
export * from "./relationships";
export * from "./tags";
export * from "./audit";
export * from "./users";
export * from "./auth";
export * from "./api-tokens";
export * from "./governance";
export * from "./webhooks";
export * from "./saved-searches";
export * from "./notifications";

// ── PLANV2 — Unified document meta-model ──────────────────────────────────────
export * from "./documents";
export * from "./relationship-rules";
export * from "./reports";
export * from "./dashboards";
export * from "./metamodel-templates";
export * from "./decisions";
export * from "./milestones";
