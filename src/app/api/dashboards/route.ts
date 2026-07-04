/**
 * PLANV2 Phase 8 — Dashboards collection API.
 *
 * GET  /api/dashboards — list system + shared + own dashboards.
 * POST /api/dashboards — create a dashboard (slug unique, optional isDefault,
 *                        widgets[] each carrying its own validated data source).
 */

import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { dashboards, dashboardComponents } from "@/db/schema";
import { withErrorHandler, ok, created, badRequest, parseBody, conflict } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { validateDataSource } from "@/lib/data-source-engine";

const widgetInputSchema = z.object({
  componentKey: z.string().min(1).max(100),
  title: z.string().max(255).optional(),
  dataSource: z.unknown(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  width: z.string().max(20).optional(),
});

const createDashboardSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with dashes"),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isShared: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  widgets: z.array(widgetInputSchema).optional(),
});

// ── GET (list) ─────────────────────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;

  const rows = await db
    .select()
    .from(dashboards)
    .where(
      or(
        eq(dashboards.isSystem, true),
        eq(dashboards.isShared, true),
        eq(dashboards.ownerId, auth.auth.userId)
      )
    );

  return ok(rows);
});

// ── POST (create) ──────────────────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "edit");
  if (!authz.ok) return authz.response;

  const parsed = await parseBody(request, createDashboardSchema);
  if ("error" in parsed) return parsed.error;
  const input = parsed.data;

  // Validate every widget's data source before persisting anything.
  try {
    for (const w of input.widgets ?? []) {
      validateDataSource(w.dataSource);
    }
  } catch (err) {
    if (err instanceof ZodError) return badRequest("Invalid widget data source configuration");
    throw err;
  }

  const [existing] = await db
    .select({ id: dashboards.id })
    .from(dashboards)
    .where(eq(dashboards.slug, input.slug))
    .limit(1);
  if (existing) return conflict(`A dashboard with slug '${input.slug}' already exists`);

  const [dashboard] = await db
    .insert(dashboards)
    .values({
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      isShared: input.isShared ?? true,
      isDefault: input.isDefault ?? false,
      ownerId: auth.auth.userId,
    })
    .returning();

  if (input.widgets && input.widgets.length > 0) {
    await db.insert(dashboardComponents).values(
      input.widgets.map((w, i) => ({
        dashboardId: dashboard.id,
        componentKey: w.componentKey,
        title: w.title ?? null,
        dataSource: w.dataSource as Record<string, unknown>,
        enabled: w.enabled ?? true,
        sortOrder: w.sortOrder ?? i,
        config: w.config ?? null,
        width: w.width ?? "half",
      }))
    );
  }

  const widgets = await db
    .select()
    .from(dashboardComponents)
    .where(eq(dashboardComponents.dashboardId, dashboard.id));

  return created({ ...dashboard, widgets });
});
