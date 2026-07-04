/**
 * PLAN 10.2 — Notification Preferences API
 *
 * GET /api/notifications/preferences — the current user's preferences (defaults
 *                                       returned if no row exists yet).
 * PUT /api/notifications/preferences — upsert the current user's preferences.
 *
 * Scoped to the authenticated user (auth.auth.userId). Per-user data; any valid
 * session is sufficient (not RBAC-role-gated).
 */

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notificationPreferences } from "@/db/schema/notifications";
import { ok, withErrorHandler, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

const DEFAULT_PREFS = {
  emailNotifs: true,
  emailOnSubscribedChange: true,
  emailOnMention: true,
  weeklyDigest: false,
  inAppEnabled: true,
};

const updatePrefsSchema = z.object({
  emailNotifs: z.boolean().optional(),
  emailOnSubscribedChange: z.boolean().optional(),
  emailOnMention: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

function serialize(row: {
  emailNotifs: boolean;
  emailOnSubscribedChange: boolean;
  emailOnMention: boolean;
  weeklyDigest: boolean;
  inAppEnabled: boolean;
}) {
  return {
    emailNotifs: row.emailNotifs,
    emailOnSubscribedChange: row.emailOnSubscribedChange,
    emailOnMention: row.emailOnMention,
    weeklyDigest: row.weeklyDigest,
    inAppEnabled: row.inAppEnabled,
  };
}

export const GET = withErrorHandler(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const [row] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, auth.auth.userId))
    .limit(1);

  return ok(row ? serialize(row) : DEFAULT_PREFS);
});

export const PUT = withErrorHandler(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, updatePrefsSchema);
  if ("error" in body) return body.error;

  const userId = auth.auth.userId;

  const [row] = await db
    .insert(notificationPreferences)
    .values({ userId, ...DEFAULT_PREFS, ...body.data })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { ...body.data },
    })
    .returning();

  return ok(serialize(row));
});
