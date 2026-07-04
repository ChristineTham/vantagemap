/**
 * PLANV2 Phase 13 — Meta-model templates: list.
 *
 * GET /api/admin/templates — list stored templates (Admin only).
 */

import { db } from "@/db";
import { metamodelTemplates } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { ok, withErrorHandler } from "@/lib/api-response";
import { asc } from "drizzle-orm";

export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const rows = await db
    .select({
      key: metamodelTemplates.key,
      name: metamodelTemplates.name,
      version: metamodelTemplates.version,
      isBuiltin: metamodelTemplates.isBuiltin,
      isActive: metamodelTemplates.isActive,
    })
    .from(metamodelTemplates)
    .orderBy(asc(metamodelTemplates.name));

  return ok(rows);
});
