/**
 * PLANV2 — Saved dashboard definitions and their widget layouts.
 *
 * Dashboards reuse the same component library and data-source engine as reports,
 * but each widget owns its own data source (vs. one shared source for a report).
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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const dashboards = pgTable("dashboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  isSystem: boolean("is_system").notNull().default(false),
  isShared: boolean("is_shared").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const dashboardComponents = pgTable(
  "dashboard_components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dashboardId: uuid("dashboard_id")
      .notNull()
      .references(() => dashboards.id, { onDelete: "cascade" }),
    componentKey: varchar("component_key", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }),
    dataSource: jsonb("data_source").$type<Record<string, unknown>>().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    config: jsonb("config").$type<Record<string, unknown>>(),
    width: varchar("width", { length: 20 }).notNull().default("half"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_dashboard_components_dashboard").on(table.dashboardId)]
);

export const dashboardsRelations = relations(dashboards, ({ one, many }) => ({
  owner: one(users, { fields: [dashboards.ownerId], references: [users.id] }),
  components: many(dashboardComponents),
}));

export const dashboardComponentsRelations = relations(dashboardComponents, ({ one }) => ({
  dashboard: one(dashboards, {
    fields: [dashboardComponents.dashboardId],
    references: [dashboards.id],
  }),
}));
