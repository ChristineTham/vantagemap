/**
 * PLANV3 Phase 4/5/14 — Config change impact analysis (read-only).
 *
 * POST /api/admin/config/impact — count affected documents/relationships/field
 * values for a proposed meta-model change and return the ImpactResult. No
 * mutation is performed. Admin-only.
 */

import { z } from "zod";
import { ok, parseBody, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { computeImpact } from "@/lib/config-apply";
import type { ConfigChangeType } from "@/lib/config-impact";

const CHANGE_TYPES = [
  "rename_type_label",
  "rekey_type",
  "delete_type",
  "add_field",
  "disable_field",
  "delete_field",
  "change_field_type",
  "rename_field_key",
  "remove_option",
  "make_required",
  "remove_relationship_rule",
] as const;

const impactSchema = z.object({
  change: z.enum(CHANGE_TYPES),
  typeKey: z.string().optional(),
  fieldKey: z.string().optional(),
  rule: z
    .object({
      sourceTypeKey: z.string(),
      targetTypeKey: z.string(),
      relationshipType: z.string(),
    })
    .optional(),
});

export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const parsed = await parseBody(request, impactSchema);
  if ("error" in parsed) return parsed.error;

  const result = await computeImpact({
    change: parsed.data.change as ConfigChangeType,
    typeKey: parsed.data.typeKey,
    fieldKey: parsed.data.fieldKey,
    rule: parsed.data.rule,
  });

  return ok(result);
});
