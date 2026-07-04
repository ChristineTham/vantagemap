/**
 * PLAN 11.2 / 10.2 — Notifications Schema
 *
 * Tables: Notification, NotificationPreferences
 *
 * `notifications` holds in-app notifications delivered to a user (e.g. when a
 * fact sheet they subscribe to changes). `notification_preferences` persists
 * each user's delivery preferences server-side (previously localStorage-only).
 *
 * NOTE: Both tables are per-user data. Rows are always scoped by userId at the
 * API boundary — a user may only see and modify their OWN notifications and
 * preferences.
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// ── Notification ─────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Notification category, e.g. "subscribed-change" or "mention".
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    // The fact sheet / entity this notification relates to (optional deep link).
    entityType: varchar("entity_type", { length: 50 }),
    entityId: varchar("entity_id", { length: 64 }),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_notifications_user_read").on(table.userId, table.read)]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ── Notification Preferences ─────────────────────────────────────────────────

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  // Master switch for email delivery.
  emailNotifs: boolean("email_notifs").notNull().default(true),
  // Email when a fact sheet the user subscribes to changes.
  emailOnSubscribedChange: boolean("email_on_subscribed_change").notNull().default(true),
  // Email when the user is mentioned / assigned (Responsible / Accountable).
  emailOnMention: boolean("email_on_mention").notNull().default(true),
  // Deliver a weekly summary digest.
  weeklyDigest: boolean("weekly_digest").notNull().default(false),
  // Master switch for in-app notifications.
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));
