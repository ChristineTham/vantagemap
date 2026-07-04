/**
 * Step 3.7 — Audit Log Table
 *
 * Immutable AuditEntry table: actor, action, target, timestamp, diff (JSONB).
 * Indexed for p95 <1 s retrieval per nfr.md.
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { auditActionEnum } from "./enums";

export const auditEntries = pgTable(
  "audit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Who
    actorId: uuid("actor_id"), // FK to users — null for system actions
    actorType: varchar("actor_type", { length: 50 }).notNull().default("user"), // "user" | "system" | "technical_user"
    actorDisplayName: varchar("actor_display_name", { length: 255 }),

    // What
    action: auditActionEnum("action").notNull(),

    // Target — varchar (not the fact_sheet_type enum) so governance, integration,
    // and admin entities (Webhook, Survey, ApiToken, User, …) can also be audited.
    targetType: varchar("target_type", { length: 64 }).notNull(),
    targetId: varchar("target_id", { length: 255 }).notNull(),
    targetDisplayName: varchar("target_display_name", { length: 255 }),

    // Diff
    diff: jsonb("diff").$type<Record<string, unknown>>(), // { field: { old: ..., new: ... } }

    // Request context
    requestContext: jsonb("request_context").$type<{
      ip?: string;
      userAgent?: string;
      method?: string;
      path?: string;
    }>(),

    // Reason for failed auth attempts
    reason: text("reason"),

    // When (immutable — no updatedAt)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // p95 <1 s retrieval: filter by target entity
    index("idx_audit_target").on(table.targetType, table.targetId),
    // Filter by actor
    index("idx_audit_actor").on(table.actorId),
    // Filter by action type
    index("idx_audit_action").on(table.action),
    // Time-range queries (most recent first)
    index("idx_audit_created_at").on(table.createdAt),
    // Combined filter: actor + time range
    index("idx_audit_actor_time").on(table.actorId, table.createdAt),
  ]
);
