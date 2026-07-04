/**
 * PLANV3 — Saved report definitions and their component layouts.
 *
 * Reports reuse the page-component library plus an explicit data-source
 * configuration (single / relationship-join / aggregate) executed by the
 * data-source engine.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  isSystem: boolean("is_system").notNull().default(false),
  isShared: boolean("is_shared").notNull().default(true),
  category: varchar("category", { length: 100 }),
  dataSource: jsonb("data_source").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const reportComponents = pgTable(
  "report_components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    componentKey: varchar("component_key", { length: 100 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    config: jsonb("config").$type<Record<string, unknown>>(),
    width: varchar("width", { length: 20 }).notNull().default("full"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_report_components_report").on(table.reportId),
    unique("uq_report_components_key").on(table.reportId, table.componentKey),
  ]
);

export const reportsRelations = relations(reports, ({ one, many }) => ({
  owner: one(users, { fields: [reports.ownerId], references: [users.id] }),
  components: many(reportComponents),
}));

export const reportComponentsRelations = relations(reportComponents, ({ one }) => ({
  report: one(reports, { fields: [reportComponents.reportId], references: [reports.id] }),
}));
