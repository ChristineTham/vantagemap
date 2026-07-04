/**
 * PLANV3 Phase 13 — Meta-model templates: apply / switch.
 *
 * POST /api/admin/templates/[key]/apply — apply a stored template to the live
 * config (merge or replace), mark it active (others inactive), invalidate the
 * registry cache. Admin only.
 */

import { db } from "@/db";
import { metamodelTemplates } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { ok, notFound, badRequest, withErrorHandler } from "@/lib/api-response";
import { parseTemplate } from "@/lib/template-engine";
import { applyTemplate } from "@/lib/config-export";
import { eq } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({ mode: z.enum(["merge", "replace"]).default("replace") });

export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ key: string }> }) => {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const authz = requirePermission(auth.auth, "manage_workspace");
    if (!authz.ok) return authz.response;

    const { key } = await params;

    // Body is optional; default to replace.
    let mode: "merge" | "replace" = "replace";
    try {
      const raw = await request.json();
      const parsed = bodySchema.safeParse(raw ?? {});
      if (!parsed.success) return badRequest("Invalid mode; expected 'merge' or 'replace'");
      mode = parsed.data.mode;
    } catch {
      // No/empty body — keep default.
    }

    const [row] = await db
      .select()
      .from(metamodelTemplates)
      .where(eq(metamodelTemplates.key, key))
      .limit(1);

    if (!row) return notFound(`Template '${key}' not found`);

    const template = parseTemplate(row.definition);
    await applyTemplate(template, mode);

    return ok({ key, mode, applied: true });
  }
);
