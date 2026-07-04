/**
 * PLANV2 Phase 4/5 — Single page-component (update / reorder / delete).
 *
 * PATCH  /api/admin/document-types/[id]/page-components/[componentId]
 * DELETE /api/admin/document-types/[id]/page-components/[componentId]
 * Admin-only.
 */

import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { documentPageComponents } from "@/db/schema";
import { ok, notFound, parseBody, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { auditMutation } from "@/lib/audit";
import { invalidateRegistry } from "@/lib/document-registry";
import type { AuditTargetType } from "@/lib/audit-types";

const DOCUMENT_CONFIG = "DocumentConfig" as unknown as AuditTargetType;

const patchComponentSchema = z.object({
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string(), z.unknown()).nullable().optional(),
  width: z.string().max(20).optional(),
});

type Ctx = { params: Promise<{ id: string; componentId: string }> };

async function loadComponent(typeConfigId: string, componentId: string) {
  const [row] = await db
    .select()
    .from(documentPageComponents)
    .where(
      and(
        eq(documentPageComponents.id, componentId),
        eq(documentPageComponents.typeConfigId, typeConfigId)
      )
    )
    .limit(1);
  return row ?? null;
}

export const PATCH = withErrorHandler(async (request: Request, context) => {
  const { id, componentId } = await (context as unknown as Ctx).params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const component = await loadComponent(id, componentId);
  if (!component) return notFound("Page component not found");

  const parsed = await parseBody(request, patchComponentSchema);
  if ("error" in parsed) return parsed.error;

  const [updated] = await db
    .update(documentPageComponents)
    .set(parsed.data)
    .where(eq(documentPageComponents.id, componentId))
    .returning();

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "update",
      targetType: DOCUMENT_CONFIG,
      targetId: componentId,
      targetDisplayName: `component ${updated.componentKey}`,
      request,
    });
  });

  return ok(updated);
});

export const DELETE = withErrorHandler(async (request: Request, context) => {
  const { id, componentId } = await (context as unknown as Ctx).params;

  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const component = await loadComponent(id, componentId);
  if (!component) return notFound("Page component not found");

  await db.delete(documentPageComponents).where(eq(documentPageComponents.id, componentId));

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "delete",
      targetType: DOCUMENT_CONFIG,
      targetId: componentId,
      targetDisplayName: `component ${component.componentKey}`,
      request,
    });
  });

  return ok({ id: componentId, deleted: true });
});
