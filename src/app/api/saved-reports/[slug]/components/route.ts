/**
 * PLANV3 Phase 7 — Saved Report components API.
 *
 * GET  /api/saved-reports/[slug]/components — list components (sorted).
 * POST /api/saved-reports/[slug]/components — add a component, or reorder the
 *      existing set. Pass `{ reorder: [{ componentKey, sortOrder }, ...] }` to
 *      reorder, otherwise a single component payload to add.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, reportComponents } from "@/db/schema";
import { withErrorHandler, ok, created, notFound, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

type Ctx = { params: Promise<{ slug: string }> };

const addComponentSchema = z.object({
  componentKey: z.string().min(1).max(100),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  width: z.string().max(20).optional(),
});

const reorderSchema = z.object({
  reorder: z.array(z.object({ componentKey: z.string(), sortOrder: z.number().int() })).min(1),
});

const postSchema = z.union([reorderSchema, addComponentSchema]);

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
    .where(eq(reportComponents.reportId, report.id))
    .orderBy(reportComponents.sortOrder);

  return ok(components);
});

// ── POST (add or reorder) ─────────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest, context: Ctx) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "edit");
  if (!authz.ok) return authz.response;

  const { slug } = await context.params;
  const report = await findBySlug(slug);
  if (!report) return notFound(`Report '${slug}' not found`);

  const parsed = await parseBody(request, postSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  if ("reorder" in body) {
    for (const entry of body.reorder) {
      await db
        .update(reportComponents)
        .set({ sortOrder: entry.sortOrder })
        .where(
          and(
            eq(reportComponents.reportId, report.id),
            eq(reportComponents.componentKey, entry.componentKey)
          )
        );
    }
    const components = await db
      .select()
      .from(reportComponents)
      .where(eq(reportComponents.reportId, report.id))
      .orderBy(reportComponents.sortOrder);
    return ok(components);
  }

  const [component] = await db
    .insert(reportComponents)
    .values({
      reportId: report.id,
      componentKey: body.componentKey,
      enabled: body.enabled ?? true,
      sortOrder: body.sortOrder ?? 0,
      config: body.config ?? null,
      width: body.width ?? "full",
    })
    .returning();

  return created(component);
});
