/**
 * PLANV3 Phase 7 — Saved Report item API.
 *
 * GET    /api/saved-reports/[slug]  — report + components + executed data.
 * PATCH  /api/saved-reports/[slug]  — update metadata / data source.
 * DELETE /api/saved-reports/[slug]  — delete (blocked for system reports).
 */

import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, reportComponents } from "@/db/schema";
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

const updateReportSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  isShared: z.boolean().optional(),
  dataSource: z.unknown().optional(),
});

async function findBySlug(slug: string) {
  const [report] = await db.select().from(reports).where(eq(reports.slug, slug)).limit(1);
  return report ?? null;
}

// ── GET ─────────────────────────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest, context: Ctx) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;

  const { slug } = await context.params;
  const report = await findBySlug(slug);
  if (!report) return notFound(`Report '${slug}' not found`);

  const components = await db
    .select()
    .from(reportComponents)
    .where(eq(reportComponents.reportId, report.id));

  let data: unknown = null;
  try {
    const config = validateDataSource(report.dataSource);
    data = await executeDataSource(config);
  } catch {
    // A saved report may hold a stale/invalid source; surface null rather than 500.
    data = null;
  }

  return ok({ ...report, components, data });
});

// ── PATCH ───────────────────────────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest, context: Ctx) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "edit");
  if (!authz.ok) return authz.response;

  const { slug } = await context.params;
  const report = await findBySlug(slug);
  if (!report) return notFound(`Report '${slug}' not found`);

  const parsed = await parseBody(request, updateReportSchema);
  if ("error" in parsed) return parsed.error;
  const input = parsed.data;

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.category !== undefined) patch.category = input.category;
  if (input.isShared !== undefined) patch.isShared = input.isShared;

  if (input.dataSource !== undefined) {
    try {
      validateDataSource(input.dataSource);
    } catch (err) {
      if (err instanceof ZodError) return badRequest("Invalid data source configuration");
      throw err;
    }
    patch.dataSource = input.dataSource as Record<string, unknown>;
  }

  const [updated] = await db
    .update(reports)
    .set(patch)
    .where(eq(reports.id, report.id))
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
  const report = await findBySlug(slug);
  if (!report) return notFound(`Report '${slug}' not found`);

  if (report.isSystem) {
    return badRequest("System reports cannot be deleted");
  }

  await db.delete(reports).where(eq(reports.id, report.id));

  return noContent();
});
