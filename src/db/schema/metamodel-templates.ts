/**
 * PLANV2 — Meta-model template registry.
 *
 * A template is the entire meta-model configuration (types, fields, relations,
 * layouts, reports, dashboards) as portable JSON. Exactly one template is active
 * at a time (the baseline the live config derived from).
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";

export const metamodelTemplates = pgTable("metamodel_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }).notNull().default("1.0.0"),
  schemaVersion: integer("schema_version").notNull().default(1),
  isBuiltin: boolean("is_builtin").notNull().default(false),
  isActive: boolean("is_active").notNull().default(false),
  definition: jsonb("definition").$type<Record<string, unknown>>().notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
