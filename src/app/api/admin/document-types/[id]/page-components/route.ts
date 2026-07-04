/**
 * PLANV2 Phase 4/5 — Page-component layout for a document type.
 *
 * GET  /api/admin/document-types/[id]/page-components — list components (ordered).
 * POST /api/admin/document-types/[id]/page-components — add a component.
 * Admin-only.
 */

import { after } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { documentTypeConfigs, documentPageComponents } from "@/db/schema";
import { ok, created, badRequest, parseBody, notFound, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { auditMutation } from "@/lib/audit";
import { invalidateRegistry } from "@/lib/document-registry";
import type { AuditTargetType } from "@/lib/audit-types";

const DOCUMENT_CONFIG = "DocumentConfig" as unknown as AuditTargetType;

const createComponentSchema = z.object({
  componentKey: z.string().min(1).max(100),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
  width: z.string().max(20).optional(),
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

  const rows = await db
    .select()
    .from(documentPageComponents)
    .where(eq(documentPageComponents.typeConfigId, id))
    .orderBy(asc(documentPageComponents.sortOrder));

  return ok(rows);
});

export const POST = withErrorHandler(async (request: Request, context) => {
  const { id } = await (context as unknown as Ctx).params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const type = await loadType(id);
  if (!type) return notFound("Document type not found");

  const parsed = await parseBody(request, createComponentSchema);
  if ("error" in parsed) return parsed.error;
  const input = parsed.data;

  const [existing] = await db
    .select({ id: documentPageComponents.id })
    .from(documentPageComponents)
    .where(
      and(
        eq(documentPageComponents.typeConfigId, id),
        eq(documentPageComponents.componentKey, input.componentKey)
      )
    )
    .limit(1);
  if (existing) {
    return badRequest(`Component '${input.componentKey}' already exists on this type`);
  }

  const [row] = await db
    .insert(documentPageComponents)
    .values({
      typeConfigId: id,
      componentKey: input.componentKey,
      enabled: input.enabled ?? true,
      sortOrder: input.sortOrder ?? 0,
      config: input.config ?? undefined,
      width: input.width ?? "full",
    })
    .returning();

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "create",
      targetType: DOCUMENT_CONFIG,
      targetId: row.id,
      targetDisplayName: `component ${type.typeKey}.${row.componentKey}`,
      request,
    });
  });

  return created(row);
});
