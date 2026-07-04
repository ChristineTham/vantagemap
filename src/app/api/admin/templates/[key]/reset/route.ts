/**
 * PLANV2 Phase 13 — Meta-model templates: destructive reset.
 *
 * POST /api/admin/templates/[key]/reset — delete ALL documents and the entire
 * live custom config, then re-apply the template from scratch. Invalidates the
 * registry cache. Admin only.
 */

import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { ok, notFound, withErrorHandler } from "@/lib/api-response";
import { resetToTemplate } from "@/lib/config-export";

export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ key: string }> }) => {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const authz = requirePermission(auth.auth, "manage_workspace");
    if (!authz.ok) return authz.response;

    const { key } = await params;

    try {
      await resetToTemplate(key);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return notFound(`Template '${key}' not found`);
      }
      throw err;
    }

    return ok({ key, reset: true });
  }
);
