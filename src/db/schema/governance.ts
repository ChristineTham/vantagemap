/**
 * Phase 11 — Additional Schema: Comments, Todos, Surveys
 *
 * New tables for governance features not covered in Phase 3.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// ── Comments ────────────────────────────────────────────────────────────────

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factSheetType: varchar("fact_sheet_type", { length: 100 }).notNull(),
    factSheetId: uuid("fact_sheet_id").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"), // Self-reference for threaded replies
    content: text("content").notNull(),
    mentions: jsonb("mentions").$type<string[]>(), // Array of user IDs mentioned
    editedAt: timestamp("edited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_comments_entity").on(table.factSheetType, table.factSheetId),
    index("idx_comments_author").on(table.authorId),
    index("idx_comments_parent").on(table.parentId),
  ]
);

export const commentsRelations = relations(comments, ({ one, many }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "replies",
  }),
  replies: many(comments, { relationName: "replies" }),
}));

// ── Todos ───────────────────────────────────────────────────────────────────

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factSheetType: varchar("fact_sheet_type", { length: 100 }).notNull(),
    factSheetId: uuid("fact_sheet_id").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    done: boolean("done").notNull().default(false),
    dueDate: timestamp("due_date", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_todos_entity").on(table.factSheetType, table.factSheetId),
    index("idx_todos_assignee").on(table.assigneeId),
    index("idx_todos_created_by").on(table.createdById),
  ]
);

export const todosRelations = relations(todos, ({ one }) => ({
  assignee: one(users, {
    fields: [todos.assigneeId],
    references: [users.id],
    relationName: "assignedTodos",
  }),
  createdBy: one(users, {
    fields: [todos.createdById],
    references: [users.id],
    relationName: "createdTodos",
  }),
}));

// ── Surveys ─────────────────────────────────────────────────────────────────

export const surveys = pgTable(
  "surveys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    factSheetType: varchar("fact_sheet_type", { length: 100 }),
    factSheetId: uuid("fact_sheet_id"),
    status: varchar("status", { length: 50 }).notNull().default("draft"), // draft, active, closed
    closesAt: timestamp("closes_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_surveys_creator").on(table.createdById),
    index("idx_surveys_entity").on(table.factSheetType, table.factSheetId),
  ]
);

export const surveyQuestions = pgTable(
  "survey_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    questionText: text("question_text").notNull(),
    questionType: varchar("question_type", { length: 50 }).notNull().default("text"), // text, select, rating, boolean
    options: jsonb("options").$type<string[]>(), // For select-type questions
    targetField: varchar("target_field", { length: 255 }), // Fact sheet field to update
    sortOrder: integer("sort_order").notNull().default(0),
    required: boolean("required").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_survey_questions_survey").on(table.surveyId)]
);

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    surveyId: uuid("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: "cascade" }),
    respondentId: uuid("respondent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: text("value"), // Free text or serialized answer
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_survey_responses_survey").on(table.surveyId),
    index("idx_survey_responses_respondent").on(table.respondentId),
  ]
);

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [surveys.createdById],
    references: [users.id],
  }),
  questions: many(surveyQuestions),
}));

export const surveyQuestionsRelations = relations(surveyQuestions, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyQuestions.surveyId],
    references: [surveys.id],
  }),
  responses: many(surveyResponses),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  survey: one(surveys, {
    fields: [surveyResponses.surveyId],
    references: [surveys.id],
  }),
  question: one(surveyQuestions, {
    fields: [surveyResponses.questionId],
    references: [surveyQuestions.id],
  }),
  respondent: one(users, {
    fields: [surveyResponses.respondentId],
    references: [users.id],
  }),
}));

// ── Quality Seal Transitions ────────────────────────────────────────────────

export const qualitySealTransitions = pgTable(
  "quality_seal_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    factSheetType: varchar("fact_sheet_type", { length: 100 }).notNull(),
    factSheetId: uuid("fact_sheet_id").notNull(),
    fromState: varchar("from_state", { length: 50 }).notNull(),
    toState: varchar("to_state", { length: 50 }).notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_qs_transitions_entity").on(table.factSheetType, table.factSheetId)]
);

export const qualitySealTransitionsRelations = relations(qualitySealTransitions, ({ one }) => ({
  actor: one(users, {
    fields: [qualitySealTransitions.actorId],
    references: [users.id],
  }),
}));
