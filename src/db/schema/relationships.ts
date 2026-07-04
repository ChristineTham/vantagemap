/**
 * Step 3.5 — Relationship and Edge Tables
 *
 * Generic typed edge table for entity-to-entity relationships.
 * Supports all relationship types from MODEL.md §4.
 * Includes relationship type, direction, and metadata columns.
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, index, unique } from "drizzle-orm/pg-core";

// ── Generic Relationship Edge Table ─────────────────────────────────────────
// PLANV3: type columns are varchar (not the fixed fact_sheet_type enum) so that
// documents of any configured/custom type can be related.

export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Source entity
    sourceType: varchar("source_type", { length: 100 }).notNull(),
    sourceId: uuid("source_id").notNull(),

    // Target entity
    targetType: varchar("target_type", { length: 100 }).notNull(),
    targetId: uuid("target_id").notNull(),

    // Relationship semantics
    relationshipType: varchar("relationship_type", { length: 100 }).notNull(),
    description: text("description"),

    // Relation-level attributes (e.g. annual cost, CRUD usage, usage type)
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Query patterns: "all relationships FROM entity X"
    index("idx_relationships_source").on(table.sourceType, table.sourceId),
    // Query patterns: "all relationships TO entity Y"
    index("idx_relationships_target").on(table.targetType, table.targetId),
    // Query patterns: "all relationships of a given type"
    index("idx_relationships_type").on(table.relationshipType),
    // Prevent duplicate edges
    unique("uq_relationships_edge").on(
      table.sourceType,
      table.sourceId,
      table.targetType,
      table.targetId,
      table.relationshipType
    ),
  ]
);
