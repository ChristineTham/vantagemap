/**
 * PLANV3 Phase 8 — Dashboard item API.
 *
 * GET    /api/dashboards/[slug]  — dashboard + widgets, each widget's data
 *                                  executed in parallel via executeDataSource.
 * PATCH  /api/dashboards/[slug]  — update metadata.
 * DELETE /api/dashboards/[slug]  — delete (blocked for system dashboards).
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dashboards, dashboardComponents } from "@/db/schema";
import {
  withErrorHandler,
  ok,
  noContent,
  notFound,
  badRequest,
  parseBody,
} from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { validateDataSource, executeDataSource } from "@/lib/data-source-engine";

type Ctx = { params: Promise<{ slug: string }> };

const updateDashboardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  isShared: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

async function findBySlug(slug: string) {
  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.slug, slug))
    .limit(1);
  return dashboard ?? null;
}

// ── GET ─────────────────────────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest, context: Ctx) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;

  const { slug } = await context.params;
  const dashboard = await findBySlug(slug);
  if (!dashboard) return notFound(`Dashboard '${slug}' not found`);

  const widgetRows = await db
    .select()
    .from(dashboardComponents)
    .where(eq(dashboardComponents.dashboardId, dashboard.id))
    .orderBy(dashboardComponents.sortOrder);

  // Execute every widget's data source in parallel.
  const widgets = await Promise.all(
    widgetRows.map(async (w) => {
      let data: unknown = null;
      try {
        const config = validateDataSource(w.dataSource);
        data = await executeDataSource(config);
      } catch {
        data = null;
      }
      return { ...w, data };
    })
  );

  return ok({ ...dashboard, widgets });
});

// ── PATCH ───────────────────────────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest, context: Ctx) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "edit");
  if (!authz.ok) return authz.response;

  const { slug } = await context.params;
  const dashboard = await findBySlug(slug);
  if (!dashboard) return notFound(`Dashboard '${slug}' not found`);

  const parsed = await parseBody(request, updateDashboardSchema);
  if ("error" in parsed) return parsed.error;
  const input = parsed.data;

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.isShared !== undefined) patch.isShared = input.isShared;
  if (input.isDefault !== undefined) patch.isDefault = input.isDefault;

  const [updated] = await db
    .update(dashboards)
    .set(patch)
    .where(eq(dashboards.id, dashboard.id))
    .returning();

  return ok(updated);
});

// ── DELETE ──────────────────────────────────────────────────────────────────

export const DELETE = withErrorHandler(async (request: NextRequest, context: Ctx) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "edit");
  if (!authz.ok) return authz.response;

  const { slug } = await context.params;
  const dashboard = await findBySlug(slug);
  if (!dashboard) return notFound(`Dashboard '${slug}' not found`);

  if (dashboard.isSystem) {
    return badRequest("System dashboards cannot be deleted");
  }

  await db.delete(dashboards).where(eq(dashboards.id, dashboard.id));

  return noContent();
});
