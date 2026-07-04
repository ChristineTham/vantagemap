/**
 * PLANV2 Phase 4/5 — Relationship rule configuration.
 *
 * GET  /api/admin/relationship-rules — list all rules.
 * POST /api/admin/relationship-rules — create a rule. Admin-only.
 */

import { after } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { relationshipRules } from "@/db/schema";
import { ok, created, badRequest, parseBody, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { auditMutation } from "@/lib/audit";
import { invalidateRegistry } from "@/lib/document-registry";
import type { AuditTargetType } from "@/lib/audit-types";

const DOCUMENT_CONFIG = "DocumentConfig" as unknown as AuditTargetType;

const createRuleSchema = z.object({
  sourceTypeKey: z.string().min(1).max(100),
  targetTypeKey: z.string().min(1).max(100),
  relationshipType: z.string().min(1).max(100),
  reverseLabel: z.string().max(100).nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const rows = await db
    .select()
    .from(relationshipRules)
    .orderBy(asc(relationshipRules.sourceTypeKey));

  return ok(rows);
});

export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const parsed = await parseBody(request, createRuleSchema);
  if ("error" in parsed) return parsed.error;
  const input = parsed.data;

  const [existing] = await db
    .select({ id: relationshipRules.id })
    .from(relationshipRules)
    .where(
      and(
        eq(relationshipRules.sourceTypeKey, input.sourceTypeKey),
        eq(relationshipRules.targetTypeKey, input.targetTypeKey),
        eq(relationshipRules.relationshipType, input.relationshipType)
      )
    )
    .limit(1);
  if (existing) {
    return badRequest("A relationship rule for this source/target/type already exists");
  }

  const [row] = await db
    .insert(relationshipRules)
    .values({
      sourceTypeKey: input.sourceTypeKey,
      targetTypeKey: input.targetTypeKey,
      relationshipType: input.relationshipType,
      reverseLabel: input.reverseLabel ?? undefined,
      description: input.description ?? undefined,
      isActive: input.isActive ?? true,
    })
    .returning();

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "create",
      targetType: DOCUMENT_CONFIG,
      targetId: row.id,
      targetDisplayName: `rule ${row.sourceTypeKey}→${row.targetTypeKey} (${row.relationshipType})`,
      request,
    });
  });

  return created(row);
});
