/**
 * PLANV3 Phase 8 — Set default dashboard.
 *
 * POST /api/dashboards/[slug]/set-default
 *   Marks this dashboard as the default, clearing the flag on all others so
 *   exactly one dashboard is the default at a time.
 */

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dashboards } from "@/db/schema";
import { withErrorHandler, ok, notFound } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

type Ctx = { params: Promise<{ slug: string }> };

export const POST = withErrorHandler(async (request: NextRequest, context: Ctx) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "edit");
  if (!authz.ok) return authz.response;

  const { slug } = await context.params;
  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.slug, slug))
    .limit(1);
  if (!dashboard) return notFound(`Dashboard '${slug}' not found`);

  // Clear the default flag everywhere, then set it on this one.
  await db.update(dashboards).set({ isDefault: false }).where(eq(dashboards.isDefault, true));

  const [updated] = await db
    .update(dashboards)
    .set({ isDefault: true })
    .where(eq(dashboards.id, dashboard.id))
    .returning();

  return ok(updated);
});
