/**
 * PLANV2 Phase 4/5/14 — Apply a config change with chosen data-handling.
 *
 * POST /api/admin/config/apply — execute the config mutation plus the selected
 * data handling (retain / delete / migrate), invalidate the registry, and write
 * an audit entry. Neon HTTP has no interactive transactions, so the sequence is
 * best-effort (config first, then data). Admin-only.
 */

import { after } from "next/server";
import { z } from "zod";
import { ok, parseBody, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { auditMutation } from "@/lib/audit";
import { invalidateRegistry } from "@/lib/document-registry";
import { applyConfigChange } from "@/lib/config-apply";
import type { ConfigChangeType } from "@/lib/config-impact";
import type { AuditTargetType } from "@/lib/audit-types";

const DOCUMENT_CONFIG = "DocumentConfig" as unknown as AuditTargetType;

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

const applySchema = z.object({
  change: z.enum(CHANGE_TYPES),
  dataHandling: z.string().min(1),
  typeKey: z.string().optional(),
  fieldKey: z.string().optional(),
  newLabel: z.string().optional(),
  newTypeKey: z.string().optional(),
  newFieldKey: z.string().optional(),
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

  const parsed = await parseBody(request, applySchema);
  if ("error" in parsed) return parsed.error;
  const input = parsed.data;

  const result = await applyConfigChange({
    change: input.change as ConfigChangeType,
    dataHandling: input.dataHandling,
    typeKey: input.typeKey,
    fieldKey: input.fieldKey,
    newLabel: input.newLabel,
    newTypeKey: input.newTypeKey,
    newFieldKey: input.newFieldKey,
    rule: input.rule,
  });

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: input.change === "delete_type" ? "delete" : "update",
      targetType: DOCUMENT_CONFIG,
      targetId: result.typeConfigId ?? input.typeKey ?? input.change,
      targetDisplayName: `apply ${input.change} (${input.dataHandling})`,
      diff: {
        change: input.change,
        dataHandling: input.dataHandling,
        documentsAffected: result.documentsAffected,
        relationshipsAffected: result.relationshipsAffected,
      },
      request,
    });
  });

  return ok(result);
});
