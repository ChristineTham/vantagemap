/**
 * PLAN 11.2 — Notification engine
 *
 * Creates in-app notifications and (best-effort) email deliveries when fact
 * sheets change. `notifySubscribers` is the helper the mutation orchestrator
 * wires into create/update/delete handlers: it fans a change out to every
 * subscriber of the affected fact sheet (except the actor who made the change).
 *
 * All email delivery is best-effort: a failed send never blocks the in-app
 * notification or the originating mutation.
 */

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { notifications, notificationPreferences } from "@/db/schema/notifications";
import { subscriptions } from "@/db/schema/tags";
import { users } from "@/db/schema/users";
import { sendEmail } from "@/lib/email";
import { withRetry } from "@/lib/neon-retry";
import type { factSheetTypeEnum } from "@/db/schema/enums";

type FactSheetType = (typeof factSheetTypeEnum.enumValues)[number];

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

/**
 * Resolve the effective notification preferences for a user, applying defaults
 * when no preferences row exists yet.
 */
async function getEffectivePrefs(userId: string) {
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  return {
    inAppEnabled: prefs?.inAppEnabled ?? true,
    emailNotifs: prefs?.emailNotifs ?? true,
    emailOnSubscribedChange: prefs?.emailOnSubscribedChange ?? true,
    emailOnMention: prefs?.emailOnMention ?? true,
  };
}

/**
 * Insert a notification row for a user and, if their preferences allow, send an
 * accompanying email (best-effort). Returns the created notification row, or
 * null if the user has in-app notifications disabled.
 */
export async function createNotification(input: CreateNotificationInput) {
  const prefs = await getEffectivePrefs(input.userId);

  if (!prefs.inAppEnabled) {
    // Respect the user's choice to suppress in-app notifications entirely.
    return null;
  }

  const [row] = await withRetry(() =>
    db
      .insert(notifications)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      })
      .returning()
  );

  // Decide whether email delivery is enabled for this notification type.
  const emailAllowed =
    prefs.emailNotifs &&
    (input.type === "mention" ? prefs.emailOnMention : prefs.emailOnSubscribedChange);

  if (emailAllowed) {
    try {
      const [user] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (user?.email) {
        const bodyText = input.body ?? "";
        await sendEmail({
          to: user.email,
          subject: input.title,
          text: bodyText ? `${input.title}\n\n${bodyText}` : input.title,
          html: `<div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
              <h1 style="font-size: 18px; color: #4a2f4a;">${input.title}</h1>
              ${bodyText ? `<p style="font-size: 14px; color: #333; line-height: 1.5;">${bodyText}</p>` : ""}
            </div>`,
        });
      }
    } catch (err) {
      // Best-effort: never let an email failure break the notification path.
      console.error("[Notifications] email delivery failed", err);
    }
  }

  return row;
}

export interface NotifySubscribersInput {
  entityType: string;
  entityId: string;
  action: string;
  /** The user who performed the change; they are excluded from notification. */
  actorId?: string | null;
  /** Human-readable name of the actor, used in the notification body. */
  displayName?: string | null;
}

/**
 * Notify every subscriber of a fact sheet that it changed — except the actor.
 *
 * Called by the mutation orchestrator from create/update/delete handlers.
 * Best-effort: swallows and logs errors so it never breaks a mutation.
 */
export async function notifySubscribers(input: NotifySubscribersInput): Promise<void> {
  try {
    const rows = await db
      .select({ userId: subscriptions.userId })
      .from(subscriptions)
      .where(
        input.actorId
          ? and(
              eq(subscriptions.factSheetType, input.entityType as FactSheetType),
              eq(subscriptions.factSheetId, input.entityId),
              ne(subscriptions.userId, input.actorId)
            )
          : and(
              eq(subscriptions.factSheetType, input.entityType as FactSheetType),
              eq(subscriptions.factSheetId, input.entityId)
            )
      );

    if (rows.length === 0) return;

    // De-duplicate: a user may subscribe with multiple roles.
    const recipientIds = Array.from(new Set(rows.map((r) => r.userId)));

    const actor = input.displayName ?? "Someone";
    const title = `${input.entityType} ${input.action}`;
    const body = `${actor} ${input.action} a ${input.entityType} you subscribe to.`;

    await Promise.all(
      recipientIds.map((userId) =>
        createNotification({
          userId,
          type: "subscribed-change",
          title,
          body,
          entityType: input.entityType,
          entityId: input.entityId,
        }).catch((err) => {
          console.error("[Notifications] failed to notify subscriber", userId, err);
          return null;
        })
      )
    );
  } catch (err) {
    console.error("[Notifications] notifySubscribers failed", err);
  }
}
