/**
 * PLANV2 — Dynamic relationship validation rules.
 *
 * Replaces the hardcoded VALID_RELATIONSHIP_PAIRS array. Admins configure which
 * relationship types are allowed between which document types. The relationship
 * creation API validates against these rules.
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, unique } from "drizzle-orm/pg-core";

export const relationshipRules = pgTable(
  "relationship_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceTypeKey: varchar("source_type_key", { length: 100 }).notNull(),
    targetTypeKey: varchar("target_type_key", { length: 100 }).notNull(),
    relationshipType: varchar("relationship_type", { length: 100 }).notNull(),
    reverseLabel: varchar("reverse_label", { length: 100 }),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("uq_relationship_rule").on(
      table.sourceTypeKey,
      table.targetTypeKey,
      table.relationshipType
    ),
  ]
);
