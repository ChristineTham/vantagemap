/**
 * Step 3.6 — Tags, Subscriptions, and Custom Fields
 *
 * Tables: TagGroup, Tag, Subscription
 * Tag groups have configurable modes. Subscriptions carry roles.
 * Custom fields are handled via JSONB columns on each fact sheet table.
 */

import { pgTable, uuid, varchar, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tagModeEnum, subscriptionRoleEnum } from "./enums";

// ── Tag Group ───────────────────────────────────────────────────────────────

export const tagGroups = pgTable("tag_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  mode: tagModeEnum("mode").notNull().default("on-the-fly"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const tagGroupsRelations = relations(tagGroups, ({ many }) => ({
  tags: many(tags),
}));

// ── Tag ─────────────────────────────────────────────────────────────────────

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tagGroupId: uuid("tag_group_id")
      .notNull()
      .references(() => tagGroups.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    color: varchar("color", { length: 50 }), // e.g. hex or Tailwind token
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("uq_tag_group_name").on(table.tagGroupId, table.name)]
);

export const tagsRelations = relations(tags, ({ one, many }) => ({
  tagGroup: one(tagGroups, {
    fields: [tags.tagGroupId],
    references: [tagGroups.id],
  }),
  assignments: many(tagAssignments),
}));

// ── Tag Assignment (join: tag ↔ fact sheet) ─────────────────────────────────

export const tagAssignments = pgTable(
  "tag_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    factSheetType: varchar("fact_sheet_type", { length: 100 }).notNull(),
    factSheetId: uuid("fact_sheet_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_tag_assignments_entity").on(table.factSheetType, table.factSheetId),
    unique("uq_tag_assignment").on(table.tagId, table.factSheetType, table.factSheetId),
  ]
);

export const tagAssignmentsRelations = relations(tagAssignments, ({ one }) => ({
  tag: one(tags, {
    fields: [tagAssignments.tagId],
    references: [tags.id],
  }),
}));

// ── Subscription (role-based ownership per fact sheet) ───────────────────────

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(), // FK to users table
    factSheetType: varchar("fact_sheet_type", { length: 100 }).notNull(),
    factSheetId: uuid("fact_sheet_id").notNull(),
    role: subscriptionRoleEnum("role").notNull().default("Observer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_subscriptions_entity").on(table.factSheetType, table.factSheetId),
    index("idx_subscriptions_user").on(table.userId),
    unique("uq_subscription").on(table.userId, table.factSheetType, table.factSheetId, table.role),
  ]
);
