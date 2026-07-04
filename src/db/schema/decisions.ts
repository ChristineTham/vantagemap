/**
 * PLANV3 — Architecture Decision support tables.
 *
 * Decisions are a specialised document type (type_key = "Decision"); their
 * status/date/context columns live in the pooled `documents` columns. These
 * tables add the decision-specific impact links and status-transition history.
 */

import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { documents } from "./documents";
import { users } from "./users";

export const decisionLinks = pgTable(
  "decision_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    impact: varchar("impact", { length: 50 }).notNull(), // affects|introduces|retires|constrains|supersedes
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_decision_links_decision").on(table.decisionId),
    index("idx_decision_links_document").on(table.documentId),
  ]
);

export const decisionTransitions = pgTable(
  "decision_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    fromState: varchar("from_state", { length: 50 }),
    toState: varchar("to_state", { length: 50 }).notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_decision_transitions_decision").on(table.decisionId)]
);

export const decisionLinksRelations = relations(decisionLinks, ({ one }) => ({
  decision: one(documents, {
    fields: [decisionLinks.decisionId],
    references: [documents.id],
    relationName: "decision",
  }),
  document: one(documents, {
    fields: [decisionLinks.documentId],
    references: [documents.id],
    relationName: "affected_document",
  }),
}));
