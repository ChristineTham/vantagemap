/**
 * PLANV3 Phase 4/5 — Single relationship rule (update / delete).
 *
 * PATCH  /api/admin/relationship-rules/[id]
 * DELETE /api/admin/relationship-rules/[id]
 * Admin-only.
 */

import { after } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { relationshipRules } from "@/db/schema";
import { ok, notFound, parseBody, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { auditMutation } from "@/lib/audit";
import { invalidateRegistry } from "@/lib/document-registry";
import type { AuditTargetType } from "@/lib/audit-types";

const DOCUMENT_CONFIG = "DocumentConfig" as unknown as AuditTargetType;

const patchRuleSchema = z.object({
  reverseLabel: z.string().max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function loadRule(id: string) {
  const [row] = await db
    .select()
    .from(relationshipRules)
    .where(eq(relationshipRules.id, id))
    .limit(1);
  return row ?? null;
}

export const PATCH = withErrorHandler(async (request: Request, context) => {
  const { id } = await (context as unknown as Ctx).params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const rule = await loadRule(id);
  if (!rule) return notFound("Relationship rule not found");

  const parsed = await parseBody(request, patchRuleSchema);
  if ("error" in parsed) return parsed.error;

  const [updated] = await db
    .update(relationshipRules)
    .set(parsed.data)
    .where(eq(relationshipRules.id, id))
    .returning();

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "update",
      targetType: DOCUMENT_CONFIG,
      targetId: id,
      targetDisplayName: `rule ${updated.sourceTypeKey}→${updated.targetTypeKey}`,
      request,
    });
  });

  return ok(updated);
});

export const DELETE = withErrorHandler(async (request: Request, context) => {
  const { id } = await (context as unknown as Ctx).params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const rule = await loadRule(id);
  if (!rule) return notFound("Relationship rule not found");

  await db.delete(relationshipRules).where(eq(relationshipRules.id, id));

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "delete",
      targetType: DOCUMENT_CONFIG,
      targetId: id,
      targetDisplayName: `rule ${rule.sourceTypeKey}→${rule.targetTypeKey}`,
      request,
    });
  });

  return ok({ id, deleted: true });
});
