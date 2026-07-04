/**
 * PLANV2 Phase 4/5 — Admin document-type configuration.
 *
 * GET  /api/admin/document-types — list all type configs (including inactive).
 * POST /api/admin/document-types — create a new document type; seeds the two
 *   universal fields (name, description). Admin-only.
 */

import { after } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { documentTypeConfigs, documentFieldConfigs } from "@/db/schema";
import { ok, created, badRequest, parseBody, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { auditMutation } from "@/lib/audit";
import { invalidateRegistry } from "@/lib/document-registry";
import { slugify, isValidSlug, isValidTypeKey } from "@/lib/config-apply";
import type { AuditTargetType } from "@/lib/audit-types";

const DOCUMENT_CONFIG = "DocumentConfig" as unknown as AuditTargetType;

const createTypeSchema = z.object({
  typeKey: z.string().min(1).max(100),
  displayName: z.string().min(1).max(255),
  pluralName: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).optional(),
  icon: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  isHierarchical: z.boolean().optional(),
  milestonesEnabled: z.boolean().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const rows = await db
    .select()
    .from(documentTypeConfigs)
    .orderBy(asc(documentTypeConfigs.sortOrder));

  return ok(rows);
});

export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const parsed = await parseBody(request, createTypeSchema);
  if ("error" in parsed) return parsed.error;
  const input = parsed.data;

  if (!isValidTypeKey(input.typeKey)) {
    return badRequest(
      "typeKey must start with a letter and contain only letters, numbers, or underscores"
    );
  }

  const slug = input.slug ?? slugify(input.typeKey);
  if (!isValidSlug(slug)) {
    return badRequest("slug must be lowercase alphanumerics separated by single hyphens");
  }

  // Uniqueness of typeKey / slug.
  const [existingKey] = await db
    .select({ id: documentTypeConfigs.id })
    .from(documentTypeConfigs)
    .where(eq(documentTypeConfigs.typeKey, input.typeKey))
    .limit(1);
  if (existingKey) return badRequest(`A document type with key '${input.typeKey}' already exists`);

  const [existingSlug] = await db
    .select({ id: documentTypeConfigs.id })
    .from(documentTypeConfigs)
    .where(eq(documentTypeConfigs.slug, slug))
    .limit(1);
  if (existingSlug) return badRequest(`A document type with slug '${slug}' already exists`);

  const [row] = await db
    .insert(documentTypeConfigs)
    .values({
      typeKey: input.typeKey,
      slug,
      displayName: input.displayName,
      pluralName: input.pluralName ?? `${input.displayName}s`,
      icon: input.icon ?? "FileText",
      color: input.color,
      isHierarchical: input.isHierarchical ?? false,
      milestonesEnabled: input.milestonesEnabled ?? false,
      description: input.description,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  // Seed the two universal fields.
  await db.insert(documentFieldConfigs).values([
    {
      typeConfigId: row.id,
      fieldKey: "name",
      fieldSource: "builtin",
      label: "Name",
      dataType: "text",
      fieldType: "text",
      required: true,
      searchable: true,
      showInList: true,
      sortOrder: 0,
    },
    {
      typeConfigId: row.id,
      fieldKey: "description",
      fieldSource: "builtin",
      label: "Description",
      dataType: "textarea",
      fieldType: "textarea",
      required: false,
      searchable: true,
      sortOrder: 1,
    },
  ]);

  invalidateRegistry();

  after(async () => {
    await auditMutation({
      auth: auth.auth,
      action: "create",
      targetType: DOCUMENT_CONFIG,
      targetId: row.id,
      targetDisplayName: `type ${row.typeKey}`,
      request,
    });
  });

  return created(row);
});
