/**
 * KPIs and their history.
 *
 * PLANV2: the legacy StrategicObjective / Initiative / Platform entity tables
 * were dropped in favour of the unified `documents` table. KPIs remain a
 * first-class sub-entity — a KPI belongs to a document (typically an Objective)
 * and carries a numeric target/current value plus a time series.
 */

import { pgTable, uuid, varchar, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { documents } from "./documents";

// ── KPI (sub-entity of a document, typically an Objective) ──────────────────

export const kpis = pgTable("kpis", {
  id: uuid("id").primaryKey().defaultRandom(),
  objectiveId: uuid("objective_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetValue: numeric("target_value"),
  currentValue: numeric("current_value"),
  unit: varchar("unit", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const kpisRelations = relations(kpis, ({ one, many }) => ({
  objective: one(documents, {
    fields: [kpis.objectiveId],
    references: [documents.id],
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
