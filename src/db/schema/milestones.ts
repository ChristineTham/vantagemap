/**
 * PLANV3 — Document milestones.
 *
 * Dated checkpoints attached to a document (primarily Initiatives, allowed on
 * any type where the type config enables milestones). Drive roadmap markers and
 * milestone timelines.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { documents } from "./documents";

export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    date: date("date").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("Planned"),
    milestoneType: varchar("milestone_type", { length: 50 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_milestones_document").on(table.documentId),
    index("idx_milestones_date").on(table.date),
  ]
);

export const milestonesRelations = relations(milestones, ({ one }) => ({
  document: one(documents, { fields: [milestones.documentId], references: [documents.id] }),
}));
