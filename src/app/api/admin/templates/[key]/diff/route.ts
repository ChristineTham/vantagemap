/**
 * PLANV2 Phase 13 — Meta-model templates: diff live config vs template.
 *
 * GET /api/admin/templates/[key]/diff — compute the added/removed/changed types
 * and fields between the live meta-model config and a stored template. Admin only.
 */

import { db } from "@/db";
import { metamodelTemplates } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { ok, notFound, withErrorHandler } from "@/lib/api-response";
import { parseTemplate, diffTemplate } from "@/lib/template-engine";
import { exportLiveConfig } from "@/lib/config-export";
import { eq } from "drizzle-orm";

export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ key: string }> }) => {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const authz = requirePermission(auth.auth, "manage_workspace");
    if (!authz.ok) return authz.response;

    const { key } = await params;

    const [row] = await db
      .select()
      .from(metamodelTemplates)
      .where(eq(metamodelTemplates.key, key))
      .limit(1);

    if (!row) return notFound(`Template '${key}' not found`);

    const template = parseTemplate(row.definition);
    const live = await exportLiveConfig();

    const diff = diffTemplate(live.types, template.types);

    return ok(diff);
  }
);
