/**
 * PLANV3 — Single document type config endpoint.
 * GET /api/types/[typeKey] — full type config with field definitions.
 */

import { withErrorHandler, ok, notFound } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { getTypeConfigByKey } from "@/lib/document-registry";

type Ctx = { params: Promise<{ typeKey: string }> };

export const GET = withErrorHandler(async (request: Request, ctx: Ctx) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { typeKey } = await ctx.params;
  const t = await getTypeConfigByKey(typeKey);
  if (!t) return notFound("Document type");

  return ok({
    typeKey: t.typeKey,
    slug: t.slug,
    displayName: t.displayName,
    pluralName: t.pluralName,
    icon: t.icon,
    color: t.color,
    isHierarchical: t.isHierarchical,
    milestonesEnabled: t.milestonesEnabled,
    fields: t.fields
      .filter((f) => f.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((f) => ({
        fieldKey: f.fieldKey,
        fieldSource: f.fieldSource,
        label: f.label,
        dataType: f.dataType,
        fieldType: f.fieldType,
        required: f.required,
        options: f.options,
        group: f.group,
        width: f.width,
        helpText: f.helpText,
        placeholder: f.placeholder,
      })),
  });
});
