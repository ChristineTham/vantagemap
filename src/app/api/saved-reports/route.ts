/**
 * PLANV2 Phase 7 — Saved Reports collection API.
 *
 * GET  /api/saved-reports  — list system + shared + own reports.
 * POST /api/saved-reports  — create a saved report (slug unique, validated
 *                            data source, optional components[]).
 *
 * Coexists with the fixed report routes under /api/reports/* — those remain
 * untouched. Saved reports live at their own conflict-free path.
 */

import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { reports, reportComponents } from "@/db/schema";
import { withErrorHandler, ok, created, badRequest, parseBody, conflict } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { validateDataSource } from "@/lib/data-source-engine";

// ── Schemas ───────────────────────────────────────────────────────────────────

const componentInputSchema = z.object({
  componentKey: z.string().min(1).max(100),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  width: z.string().max(20).optional(),
});

const createReportSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with dashes"),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  isShared: z.boolean().optional(),
  dataSource: z.unknown(),
  components: z.array(componentInputSchema).optional(),
});

// ── GET (list) ─────────────────────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;

  const rows = await db
    .select()
    .from(reports)
    .where(
      or(eq(reports.isSystem, true), eq(reports.isShared, true), eq(reports.ownerId, auth.auth.userId))
    );

  return ok(rows);
});

// ── POST (create) ──────────────────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "edit");
  if (!authz.ok) return authz.response;

  const parsed = await parseBody(request, createReportSchema);
  if ("error" in parsed) return parsed.error;
  const input = parsed.data;

  // Validate the data-source config (throws ZodError on invalid → 400).
  try {
    validateDataSource(input.dataSource);
  } catch (err) {
    if (err instanceof ZodError) {
      return badRequest("Invalid data source configuration");
    }
    throw err;
  }

  // Enforce slug uniqueness up front for a friendly 409.
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.slug, input.slug))
    .limit(1);
  if (existing) return conflict(`A report with slug '${input.slug}' already exists`);

  const [report] = await db
    .insert(reports)
    .values({
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      isShared: input.isShared ?? true,
      ownerId: auth.auth.userId,
      dataSource: input.dataSource as Record<string, unknown>,
    })
    .returning();

  if (input.components && input.components.length > 0) {
    await db.insert(reportComponents).values(
      input.components.map((c, i) => ({
        reportId: report.id,
        componentKey: c.componentKey,
        enabled: c.enabled ?? true,
        sortOrder: c.sortOrder ?? i,
        config: c.config ?? null,
        width: c.width ?? "full",
      }))
    );
  }

  const components = await db
    .select()
    .from(reportComponents)
    .where(eq(reportComponents.reportId, report.id));

  return created({ ...report, components });
});
