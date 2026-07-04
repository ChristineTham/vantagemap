/**
 * Step 3.3 — Strategy and Planning Entities
 *
 * Tables: StrategicObjective, KPI, Initiative, Platform
 * Includes Balanced Scorecard perspectives, initiative subtypes, and KPI sub-entities.
 */

import { pgTable, uuid, varchar, text, timestamp, date, numeric, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  lifecyclePhaseEnum,
  healthStatusEnum,
  qualitySealEnum,
  strategicPerspectiveEnum,
  initiativeSubtypeEnum,
  initiativeStatusEnum,
} from "./enums";

// ── Strategic Objective ─────────────────────────────────────────────────────

export const strategicObjectives = pgTable("strategic_objectives", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  perspective: strategicPerspectiveEnum("perspective").notNull(),
  parentId: uuid("parent_id"), // goal → sub-goal hierarchy
  lifecycle: lifecyclePhaseEnum("lifecycle").default("Active"),
  health: healthStatusEnum("health").default("Good"),
  qualitySeal: qualitySealEnum("quality_seal").default("Draft"),
  owner: varchar("owner", { length: 255 }),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const strategicObjectivesRelations = relations(strategicObjectives, ({ one, many }) => ({
  parent: one(strategicObjectives, {
    fields: [strategicObjectives.parentId],
    references: [strategicObjectives.id],
    relationName: "objective_hierarchy",
  }),
  children: many(strategicObjectives, {
    relationName: "objective_hierarchy",
  }),
  kpis: many(kpis),
}));

// ── KPI (sub-entity of Strategic Objective) ─────────────────────────────────

export const kpis = pgTable("kpis", {
  id: uuid("id").primaryKey().defaultRandom(),
  objectiveId: uuid("objective_id")
    .notNull()
    .references(() => strategicObjectives.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetValue: numeric("target_value"),
  currentValue: numeric("current_value"),
  unit: varchar("unit", { length: 50 }), // e.g. "%", "$", "count"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const kpisRelations = relations(kpis, ({ one, many }) => ({
  objective: one(strategicObjectives, {
    fields: [kpis.objectiveId],
    references: [strategicObjectives.id],
  }),
  history: many(kpiHistory),
}));

// ── KPI History (time series for trend charts / sparklines) ─────────────────

export const kpiHistory = pgTable("kpi_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  kpiId: uuid("kpi_id")
    .notNull()
    .references(() => kpis.id, { onDelete: "cascade" }),
  value: numeric("value").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kpiHistoryRelations = relations(kpiHistory, ({ one }) => ({
  kpi: one(kpis, { fields: [kpiHistory.kpiId], references: [kpis.id] }),
}));

// ── Initiative ──────────────────────────────────────────────────────────────

export const initiatives = pgTable("initiatives", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  subtype: initiativeSubtypeEnum("subtype").default("Project"),
  status: initiativeStatusEnum("status").default("Not Started"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget"), // whole dollars
  parentId: uuid("parent_id"), // program → project → epic hierarchy
  lifecycle: lifecyclePhaseEnum("lifecycle").default("Active"),
  health: healthStatusEnum("health").default("Good"),
  qualitySeal: qualitySealEnum("quality_seal").default("Draft"),
  owner: varchar("owner", { length: 255 }),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const initiativesRelations = relations(initiatives, ({ one, many }) => ({
  parent: one(initiatives, {
    fields: [initiatives.parentId],
    references: [initiatives.id],
    relationName: "initiative_hierarchy",
  }),
  children: many(initiatives, {
    relationName: "initiative_hierarchy",
  }),
}));

// ── Platform ────────────────────────────────────────────────────────────────

export const platforms = pgTable("platforms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  lifecycle: lifecyclePhaseEnum("lifecycle").default("Active"),
  health: healthStatusEnum("health").default("Good"),
  qualitySeal: qualitySealEnum("quality_seal").default("Draft"),
  owner: varchar("owner", { length: 255 }),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
