/**
 * PLANV2 Phase 13 — Meta-model templates: single template definition.
 *
 * GET /api/admin/templates/[key] — return a stored template's full definition.
 */

import { db } from "@/db";
import { metamodelTemplates } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { ok, notFound, withErrorHandler } from "@/lib/api-response";
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

    return ok(row);
  }
);
