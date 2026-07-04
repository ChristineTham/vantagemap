/**
 * PLAN 6.3 / 9.6 — Saved Searches Schema
 *
 * Per-user saved search/filter configurations for the cross-entity search.
 * Each saved search stores the search string, the selected entity types, and
 * the facet filters so a user can re-apply a search with one click.
 *
 * NOTE: This is per-user data. Rows are always scoped by userId at the API
 * boundary — a user may only see and modify their OWN saved searches.
 */

import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    // The raw search string.
    query: text("query"),
    // Array of entity type slugs to filter the search to.
    entityTypes: jsonb("entity_types").$type<string[]>(),
    // Facet filters: map of field -> selected value.
    filters: jsonb("filters").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_saved_searches_user").on(table.userId)]
);

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(users, {
    fields: [savedSearches.userId],
    references: [users.id],
  }),
}));
