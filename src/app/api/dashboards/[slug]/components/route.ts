/**
 * PLANV3 Phase 8 — Dashboard widget layout API.
 *
 * GET  /api/dashboards/[slug]/components — list widgets (sorted).
 * POST /api/dashboards/[slug]/components — add a widget, or reorder the layout.
 *      Pass `{ reorder: [{ id, sortOrder }, ...] }` to reorder, otherwise a
 *      single widget payload (with its own validated data source) to add.
 */

import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dashboards, dashboardComponents } from "@/db/schema";
import { withErrorHandler, ok, created, badRequest, notFound, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { validateDataSource } from "@/lib/data-source-engine";

type Ctx = { params: Promise<{ slug: string }> };

const addWidgetSchema = z.object({
  componentKey: z.string().min(1).max(100),
  title: z.string().max(255).optional(),
  dataSource: z.unknown(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  width: z.string().max(20).optional(),
});

const reorderSchema = z.object({
  reorder: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })).min(1),
});

const postSchema = z.union([reorderSchema, addWidgetSchema]);

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

  const widgets = await db
    .select()
    .from(dashboardComponents)
    .where(eq(dashboardComponents.dashboardId, dashboard.id))
    .orderBy(dashboardComponents.sortOrder);

  return ok(widgets);
});

// ── POST (add or reorder) ─────────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest, context: Ctx) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "edit");
  if (!authz.ok) return authz.response;

  const { slug } = await context.params;
  const dashboard = await findBySlug(slug);
  if (!dashboard) return notFound(`Dashboard '${slug}' not found`);

  const parsed = await parseBody(request, postSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  if ("reorder" in body) {
    for (const entry of body.reorder) {
      await db
        .update(dashboardComponents)
        .set({ sortOrder: entry.sortOrder })
        .where(
          and(
            eq(dashboardComponents.dashboardId, dashboard.id),
            eq(dashboardComponents.id, entry.id)
          )
        );
    }
    const widgets = await db
      .select()
      .from(dashboardComponents)
      .where(eq(dashboardComponents.dashboardId, dashboard.id))
      .orderBy(dashboardComponents.sortOrder);
    return ok(widgets);
  }

  try {
    validateDataSource(body.dataSource);
  } catch (err) {
    if (err instanceof ZodError) return badRequest("Invalid widget data source configuration");
    throw err;
  }

  const [widget] = await db
    .insert(dashboardComponents)
    .values({
      dashboardId: dashboard.id,
      componentKey: body.componentKey,
      title: body.title ?? null,
      dataSource: body.dataSource as Record<string, unknown>,
      enabled: body.enabled ?? true,
      sortOrder: body.sortOrder ?? 0,
      config: body.config ?? null,
      width: body.width ?? "half",
    })
    .returning();

  return created(widget);
});
