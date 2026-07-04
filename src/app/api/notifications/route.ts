/**
 * PLAN 11.2 — Notifications API (collection)
 *
 * GET   /api/notifications — the current user's notifications, newest first,
 *                            with an unread count.
 * PATCH /api/notifications — mark notifications read (all, or a selected set).
 *
 * All queries are scoped to the authenticated user (auth.auth.userId): a user
 * may only see and mutate their OWN notifications. Per-user data, not RBAC-gated.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema/notifications";
import { ok, withErrorHandler, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

const markReadSchema = z.object({
  // If ids omitted, marks ALL of the user's notifications as read.
  ids: z.array(z.string().uuid()).optional(),
  read: z.boolean().default(true),
});

export const GET = withErrorHandler(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, auth.auth.userId))
    .orderBy(desc(notifications.createdAt));

  const unreadCount = rows.reduce((n, r) => n + (r.read ? 0 : 1), 0);

  return ok({ notifications: rows, unreadCount });
});

export const PATCH = withErrorHandler(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, markReadSchema);
  if ("error" in body) return body.error;

  const { ids, read } = body.data;

  const where =
    ids && ids.length > 0
      ? and(eq(notifications.userId, auth.auth.userId), inArray(notifications.id, ids))
      : eq(notifications.userId, auth.auth.userId);

  const updated = await db
    .update(notifications)
    .set({ read })
    .where(where)
    .returning({ id: notifications.id });

  return ok({ updated: updated.length });
});
