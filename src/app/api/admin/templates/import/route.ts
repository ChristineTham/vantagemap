/**
 * PLANV3 Phase 13 — Meta-model templates: import.
 *
 * POST /api/admin/templates/import — validate an uploaded template JSON and
 * store it as a new (non-builtin) template row. Admin only.
 */

import { db } from "@/db";
import { metamodelTemplates } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { created, badRequest, withErrorHandler } from "@/lib/api-response";
import { parseTemplate } from "@/lib/template-engine";
import { eq } from "drizzle-orm";

export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Request body is not valid JSON");
  }

  let template;
  try {
    template = parseTemplate(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid template";
    return badRequest(`Malformed template: ${message}`);
  }

  // Reject collisions with an existing key (builtin or otherwise).
  const [existing] = await db
    .select({ key: metamodelTemplates.key })
    .from(metamodelTemplates)
    .where(eq(metamodelTemplates.key, template.key))
    .limit(1);

  if (existing) {
    return badRequest(`A template with key '${template.key}' already exists`);
  }

  const [row] = await db
    .insert(metamodelTemplates)
    .values({
      key: template.key,
      name: template.name,
      description: template.description,
      version: template.version,
      schemaVersion: template.schemaVersion,
      isBuiltin: false,
      isActive: false,
      definition: template as unknown as Record<string, unknown>,
    })
    .returning({
      key: metamodelTemplates.key,
      name: metamodelTemplates.name,
      version: metamodelTemplates.version,
      isBuiltin: metamodelTemplates.isBuiltin,
      isActive: metamodelTemplates.isActive,
    });

  return created(row);
});
