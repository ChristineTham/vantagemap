/**
 * PLANV3 Phase 4/5 — Single document-type configuration.
 *
 * GET    /api/admin/document-types/[id] — one type config with its fields.
 * PATCH  /api/admin/document-types/[id] — update display metadata / flags.
 * DELETE /api/admin/document-types/[id] — delete the type, its documents,
 *   relationships referencing its typeKey, and its relationship rules. Admin-only.
 */

import { after } from "next/server";
import { asc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  documentTypeConfigs,
  documentFieldConfigs,
  documents,
  relationships,
  relationshipRules,
} from "@/db/schema";
import { ok, notFound, parseBody, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { auditMutation } from "@/lib/audit";
import { invalidateRegistry } from "@/lib/document-registry";
import type { AuditTargetType } from "@/lib/audit-types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DOCUMENT_CONFIG = "DocumentConfig" as unknown as AuditTargetType;

const patchTypeSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  pluralName: z.string().min(1).max(255).optional(),
  icon: z.string().max(100).optional(),
  color: z.string().max(50).nullable().optional(),
  isHierarchical: z.boolean().optional(),
  milestonesEnabled: z.boolean().optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function loadType(id: string) {
  const [row] = await db
    .select()
    .from(documentTypeConfigs)
    .where(eq(documentTypeConfigs.id, id))
    .limit(1);
  return row ?? null;
}

export const GET = withErrorHandler(async (request: Request, context) => {
  const { id } = await (context as unknown as Ctx).params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const type = await loadType(id);
  if (!type) return notFound("Document type not found");

  const fields = await db
    .select()
    .from(documentFieldConfigs)
    .where(eq(documentFieldConfigs.typeConfigId, id))
    .orderBy(asc(documentFieldConfigs.sortOrder));

  return ok({ ...type, fields });
});

export const PATCH = withErrorHandler(async (request: Request, context) => {
  const { id } = await (context as unknown as Ctx).params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const type = await loadType(id);
  if (!type) return notFound("Document type not found");

  const parsed = await parseBody(request, patchTypeSchema);
  if ("error" in parsed) return parsed.error;

  const [updated] = await db
    .update(documentTypeConfigs)
    .set(parsed.data)
    .where(eq(documentTypeConfigs.id, id))
    .returning();

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "update",
      targetType: DOCUMENT_CONFIG,
      targetId: id,
      targetDisplayName: `type ${updated.typeKey}`,
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

  const type = await loadType(id);
  if (!type) return notFound("Document type not found");

  const typeKey = type.typeKey;

  // Delete relationships that reference this type on either endpoint.
  await db
    .delete(relationships)
    .where(
      or(
        eq(relationships.sourceType, typeKey as any),
        eq(relationships.targetType, typeKey as any)
      )
    );

  // Delete documents of this type.
  await db.delete(documents).where(eq(documents.typeKey, typeKey));

  // Delete relationship rules that reference this type on either side.
  await db
    .delete(relationshipRules)
    .where(
      or(
        eq(relationshipRules.sourceTypeKey, typeKey),
        eq(relationshipRules.targetTypeKey, typeKey)
      )
    );

  // Delete the type config (field/page-component configs cascade via FK).
  await db.delete(documentTypeConfigs).where(eq(documentTypeConfigs.id, id));

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "delete",
      targetType: DOCUMENT_CONFIG,
      targetId: id,
      targetDisplayName: `type ${typeKey}`,
      request,
    });
  });

  return ok({ id, typeKey, deleted: true });
});
