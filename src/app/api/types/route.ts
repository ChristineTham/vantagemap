/**
 * PLANV3 — Document type registry endpoint.
 * GET /api/types — list active document types with field counts.
 */

import { withErrorHandler, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { listTypeConfigs } from "@/lib/document-registry";

export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const types = await listTypeConfigs();
  return ok(
    types.map((t) => ({
      typeKey: t.typeKey,
      slug: t.slug,
      displayName: t.displayName,
      pluralName: t.pluralName,
      icon: t.icon,
      color: t.color,
      isHierarchical: t.isHierarchical,
      milestonesEnabled: t.milestonesEnabled,
      sortOrder: t.sortOrder,
      fieldCount: t.fields.filter((f) => f.enabled).length,
    }))
  );
});
