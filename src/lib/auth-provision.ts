/**
 * Links Better Auth accounts to the application's user/workspace model.
 *
 * Better Auth owns authentication (the `user`/`session`/`account` tables); the
 * application `users` table owns workspace membership, role, and status. The two
 * are joined by email. When someone signs up through Better Auth we provision a
 * matching application user and grant them access to the default workspace so
 * that `resolveUserContext` can establish a role.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, workspaces, userWorkspaceRoles } from "@/db/schema";

const DEFAULT_WORKSPACE_SLUG = "default";

/** Get the default workspace, creating it if the instance has none yet. */
async function ensureDefaultWorkspace(): Promise<string> {
  const [existingBySlug] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, DEFAULT_WORKSPACE_SLUG))
    .limit(1);
  if (existingBySlug) return existingBySlug.id;

  // Fall back to any existing workspace (e.g. a seeded one with a different slug).
  const [anyWorkspace] = await db.select({ id: workspaces.id }).from(workspaces).limit(1);
  if (anyWorkspace) return anyWorkspace.id;

  const [created] = await db
    .insert(workspaces)
    .values({ name: "Default Workspace", slug: DEFAULT_WORKSPACE_SLUG })
    .returning({ id: workspaces.id });
  return created.id;
}

/**
 * Ensure an application user + default workspace role exists for the given
 * email. Idempotent and safe to call on every sign-up. Never throws — a failure
 * here must not block authentication (it is logged instead).
 *
 * @param defaultRole role to grant a brand-new user (defaults to "Viewer").
 */
export async function provisionAppUser(params: {
  email: string;
  name: string;
  defaultRole?: "Viewer" | "Member" | "Admin";
}): Promise<void> {
  try {
    const email = params.email.toLowerCase();

    let [appUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!appUser) {
      [appUser] = await db
        .insert(users)
        .values({ email, name: params.name, status: "Active", emailVerified: true })
        .returning({ id: users.id });
    }

    const workspaceId = await ensureDefaultWorkspace();

    const [existingRole] = await db
      .select({ id: userWorkspaceRoles.id })
      .from(userWorkspaceRoles)
      .where(eq(userWorkspaceRoles.userId, appUser.id))
      .limit(1);

    if (!existingRole) {
      await db
        .insert(userWorkspaceRoles)
        .values({
          userId: appUser.id,
          workspaceId,
          role: params.defaultRole ?? "Viewer",
        })
        .onConflictDoNothing();
    }
  } catch (err) {
    console.error("[Auth] Failed to provision application user:", err);
  }
}
