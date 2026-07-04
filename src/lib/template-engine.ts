/**
 * PLANV2 — Meta-model template engine (pure serialization + diff).
 *
 * A template is the entire meta-model configuration as portable JSON. These
 * pure functions validate/parse template JSON and diff a template against the
 * live configuration. Apply/reset (which mutate the DB with referential-integrity
 * prompts) live in the config-apply layer.
 */

import { z } from "zod";

const templateFieldSchema = z.object({
  fieldKey: z.string(),
  fieldSource: z.enum(["builtin", "custom"]),
  label: z.string(),
  dataType: z.string(),
  fieldType: z.string().optional(),
  enabled: z.boolean().default(true),
  required: z.boolean().default(false),
  options: z.array(z.object({ value: z.string(), label: z.string() })).nullable().optional(),
  group: z.string().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  searchable: z.boolean().default(false),
  filterable: z.boolean().default(true),
  showInList: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const templateTypeSchema = z.object({
  typeKey: z.string(),
  slug: z.string(),
  displayName: z.string(),
  pluralName: z.string(),
  icon: z.string().default("FileText"),
  isHierarchical: z.boolean().default(false),
  milestonesEnabled: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  fields: z.array(templateFieldSchema),
});

export const templateSchema = z.object({
  schemaVersion: z.number().int().default(1),
  key: z.string(),
  name: z.string(),
  version: z.string().default("1.0.0"),
  description: z.string().optional(),
  author: z.string().optional(),
  types: z.array(templateTypeSchema),
  relationshipRules: z
    .array(
      z.object({
        sourceTypeKey: z.string(),
        targetTypeKey: z.string(),
        relationshipType: z.string(),
        reverseLabel: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export type MetaModelTemplate = z.infer<typeof templateSchema>;
export type TemplateType = z.infer<typeof templateTypeSchema>;

export const CURRENT_TEMPLATE_SCHEMA_VERSION = 1;

/** Parse + validate template JSON. Throws on malformed input or a future schema version. */
export function parseTemplate(input: unknown): MetaModelTemplate {
  const t = templateSchema.parse(input);
  if (t.schemaVersion > CURRENT_TEMPLATE_SCHEMA_VERSION) {
    throw new Error(
      `Template schemaVersion ${t.schemaVersion} is newer than supported (${CURRENT_TEMPLATE_SCHEMA_VERSION}). Upgrade the app.`
    );
  }
  return t;
}

export interface TypeDiff {
  typeKey: string;
  addedFields: string[];
  removedFields: string[];
  changedFields: string[];
}

export interface TemplateDiff {
  addedTypes: string[];
  removedTypes: string[];
  changedTypes: TypeDiff[];
}

/**
 * Diff the live configuration against a template.
 * @param current live config types
 * @param template template types
 */
export function diffTemplate(current: TemplateType[], template: TemplateType[]): TemplateDiff {
  const currentByKey = new Map(current.map((t) => [t.typeKey, t]));
  const templateByKey = new Map(template.map((t) => [t.typeKey, t]));

  const addedTypes = template.filter((t) => !currentByKey.has(t.typeKey)).map((t) => t.typeKey);
  const removedTypes = current.filter((t) => !templateByKey.has(t.typeKey)).map((t) => t.typeKey);

  const changedTypes: TypeDiff[] = [];
  for (const t of template) {
    const cur = currentByKey.get(t.typeKey);
    if (!cur) continue;
    const curFields = new Map(cur.fields.map((f) => [f.fieldKey, f]));
    const tplFields = new Map(t.fields.map((f) => [f.fieldKey, f]));

    const addedFields = t.fields.filter((f) => !curFields.has(f.fieldKey)).map((f) => f.fieldKey);
    const removedFields = cur.fields.filter((f) => !tplFields.has(f.fieldKey)).map((f) => f.fieldKey);
    const changedFields = t.fields
      .filter((f) => {
        const c = curFields.get(f.fieldKey);
        return (
          c &&
          (c.dataType !== f.dataType ||
            c.required !== f.required ||
            c.label !== f.label ||
            c.enabled !== f.enabled)
        );
      })
      .map((f) => f.fieldKey);

    if (addedFields.length || removedFields.length || changedFields.length) {
      changedTypes.push({ typeKey: t.typeKey, addedFields, removedFields, changedFields });
    }
  }

  return { addedTypes, removedTypes, changedTypes };
}
