/**
 * PLANV2 Phase 4/5 — Single field configuration.
 *
 * PATCH  /api/admin/document-types/[id]/fields/[fieldId] — update a field.
 * DELETE /api/admin/document-types/[id]/fields/[fieldId] — remove a field.
 * Admin-only.
 */

import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { documentFieldConfigs } from "@/db/schema";
import { ok, notFound, parseBody, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { auditMutation } from "@/lib/audit";
import { invalidateRegistry } from "@/lib/document-registry";
import type { AuditTargetType } from "@/lib/audit-types";

const DOCUMENT_CONFIG = "DocumentConfig" as unknown as AuditTargetType;

const optionSchema = z.object({
  value: z.string(),
  label: z.string(),
  color: z.string().optional(),
});

const patchFieldSchema = z.object({
  label: z.string().min(1).max(255).optional(),
  dataType: z.string().max(30).optional(),
  fieldType: z.string().max(50).optional(),
  required: z.boolean().optional(),
  enabled: z.boolean().optional(),
  options: z.array(optionSchema).nullable().optional(),
  validation: z.record(z.string(), z.unknown()).nullable().optional(),
  group: z.string().max(100).nullable().optional(),
  placeholder: z.string().max(255).nullable().optional(),
  helpText: z.string().nullable().optional(),
  searchable: z.boolean().optional(),
  filterable: z.boolean().optional(),
  showInList: z.boolean().optional(),
  width: z.string().max(20).optional(),
  sortOrder: z.number().int().optional(),
});

type Ctx = { params: Promise<{ id: string; fieldId: string }> };

async function loadField(typeConfigId: string, fieldId: string) {
  const [row] = await db
    .select()
    .from(documentFieldConfigs)
    .where(
      and(
        eq(documentFieldConfigs.id, fieldId),
        eq(documentFieldConfigs.typeConfigId, typeConfigId)
      )
    )
    .limit(1);
  return row ?? null;
}

export const PATCH = withErrorHandler(async (request: Request, context) => {
  const { id, fieldId } = await (context as unknown as Ctx).params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const field = await loadField(id, fieldId);
  if (!field) return notFound("Field not found");

  const parsed = await parseBody(request, patchFieldSchema);
  if ("error" in parsed) return parsed.error;

  const updates = { ...parsed.data } as Record<string, unknown>;
  // Keep fieldType in sync when only dataType is supplied.
  if (parsed.data.dataType && !parsed.data.fieldType) {
    updates.fieldType = parsed.data.dataType;
  }

  const [updated] = await db
    .update(documentFieldConfigs)
    .set(updates)
    .where(eq(documentFieldConfigs.id, fieldId))
    .returning();

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "update",
      targetType: DOCUMENT_CONFIG,
      targetId: fieldId,
      targetDisplayName: `field ${updated.fieldKey}`,
      request,
    });
  });

  return ok(updated);
});

export const DELETE = withErrorHandler(async (request: Request, context) => {
  const { id, fieldId } = await (context as unknown as Ctx).params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const field = await loadField(id, fieldId);
  if (!field) return notFound("Field not found");

  await db.delete(documentFieldConfigs).where(eq(documentFieldConfigs.id, fieldId));

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "delete",
      targetType: DOCUMENT_CONFIG,
      targetId: fieldId,
      targetDisplayName: `field ${field.fieldKey}`,
      request,
    });
  });

  return ok({ id: fieldId, deleted: true });
});
