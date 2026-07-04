/**
 * PLANV3 Phase 4/5 — Field configuration for a document type.
 *
 * GET  /api/admin/document-types/[id]/fields — list fields.
 * POST /api/admin/document-types/[id]/fields — add a field (builtin or custom).
 * Admin-only.
 */

import { after } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { documentTypeConfigs, documentFieldConfigs } from "@/db/schema";
import { ok, created, badRequest, parseBody, notFound, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { auditMutation } from "@/lib/audit";
import { invalidateRegistry } from "@/lib/document-registry";
import { classifyFieldSource, isReservedFieldKey } from "@/lib/config-apply";
import type { AuditTargetType } from "@/lib/audit-types";

const DOCUMENT_CONFIG = "DocumentConfig" as unknown as AuditTargetType;

const optionSchema = z.object({
  value: z.string(),
  label: z.string(),
  color: z.string().optional(),
});

const createFieldSchema = z.object({
  fieldKey: z.string().min(1).max(100),
  label: z.string().min(1).max(255),
  dataType: z.string().max(30).optional(),
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

  return ok(fields);
});

export const POST = withErrorHandler(async (request: Request, context) => {
  const { id } = await (context as unknown as Ctx).params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const type = await loadType(id);
  if (!type) return notFound("Document type not found");

  const parsed = await parseBody(request, createFieldSchema);
  if ("error" in parsed) return parsed.error;
  const input = parsed.data;

  if (isReservedFieldKey(input.fieldKey)) {
    return badRequest(`'${input.fieldKey}' is a reserved key and cannot be used for a field`);
  }
  const fieldSource = classifyFieldSource(input.fieldKey);
  if (!fieldSource) {
    return badRequest(`'${input.fieldKey}' is not a valid field key`);
  }

  // Reject collision with an existing field on this type.
  const [existing] = await db
    .select({ id: documentFieldConfigs.id })
    .from(documentFieldConfigs)
    .where(
      and(
        eq(documentFieldConfigs.typeConfigId, id),
        eq(documentFieldConfigs.fieldKey, input.fieldKey)
      )
    )
    .limit(1);
  if (existing) {
    return badRequest(`Field '${input.fieldKey}' already exists on this type`);
  }

  const dataType = input.dataType ?? "text";

  const [row] = await db
    .insert(documentFieldConfigs)
    .values({
      typeConfigId: id,
      fieldKey: input.fieldKey,
      fieldSource,
      label: input.label,
      dataType,
      fieldType: dataType,
      required: input.required ?? false,
      enabled: input.enabled ?? true,
      options: input.options ?? undefined,
      validation: input.validation ?? undefined,
      group: input.group ?? undefined,
      placeholder: input.placeholder ?? undefined,
      helpText: input.helpText ?? undefined,
      searchable: input.searchable ?? false,
      filterable: input.filterable ?? true,
      showInList: input.showInList ?? false,
      width: input.width ?? "full",
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "create",
      targetType: DOCUMENT_CONFIG,
      targetId: row.id,
      targetDisplayName: `field ${type.typeKey}.${row.fieldKey}`,
      request,
    });
  });

  return created(row);
});
