/**
 * PLANV3 Phase 13 — Meta-model config <-> template bridge.
 *
 * The live meta-model lives in `document_type_configs` + `document_field_configs`.
 * A template is that same shape serialized as portable JSON (see
 * `@/lib/template-engine`). This module converts between the two:
 *
 *   - `configRowsToTemplate` — PURE transform of config rows into template types.
 *   - `exportLiveConfig`     — read the live config and produce a MetaModelTemplate.
 *   - `importTemplateToConfig` — write a template's types/fields into the config tables.
 *   - `applyTemplate` / `resetToTemplate` — orchestration helpers used by the API.
 */

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  documentTypeConfigs,
  documentFieldConfigs,
  documents,
  relationshipRules,
  metamodelTemplates,
} from "@/db/schema";
import type { TypeConfigRow, FieldConfigRow } from "@/lib/document-registry";
import { listTypeConfigs, invalidateRegistry } from "@/lib/document-registry";
import {
  parseTemplate,
  CURRENT_TEMPLATE_SCHEMA_VERSION,
  type MetaModelTemplate,
  type TemplateType,
} from "@/lib/template-engine";

// ── Pure transform ────────────────────────────────────────────────────────────

/**
 * Convert live config rows into template `types`. Pure — no DB access.
 *
 * @param typeRows  document_type_configs rows
 * @param fieldRows document_field_configs rows (any type; grouped by typeConfigId)
 */
export function configRowsToTemplate(
  typeRows: TypeConfigRow[],
  fieldRows: FieldConfigRow[]
): TemplateType[] {
  const fieldsByType = new Map<string, FieldConfigRow[]>();
  for (const f of fieldRows) {
    const list = fieldsByType.get(f.typeConfigId) ?? [];
    list.push(f);
    fieldsByType.set(f.typeConfigId, list);
  }

  return [...typeRows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t) => ({
      typeKey: t.typeKey,
      slug: t.slug,
      displayName: t.displayName,
      pluralName: t.pluralName,
      icon: t.icon,
      isHierarchical: t.isHierarchical,
      milestonesEnabled: t.milestonesEnabled,
      sortOrder: t.sortOrder,
      fields: (fieldsByType.get(t.id) ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((f) => ({
          fieldKey: f.fieldKey,
          fieldSource: f.fieldSource as "builtin" | "custom",
          label: f.label,
          dataType: f.dataType,
          fieldType: f.fieldType,
          enabled: f.enabled,
          required: f.required,
          options: f.options
            ? f.options.map((o) => ({ value: o.value, label: o.label }))
            : null,
          group: f.group ?? null,
          placeholder: f.placeholder ?? null,
          helpText: f.helpText ?? null,
          searchable: f.searchable,
          filterable: f.filterable,
          showInList: f.showInList,
          sortOrder: f.sortOrder,
        })),
    }));
}

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Serialize the live document_type_configs + document_field_configs into a
 * portable MetaModelTemplate. Includes active relationship rules.
 */
export async function exportLiveConfig(): Promise<MetaModelTemplate> {
  const types = await listTypeConfigs({ includeInactive: true });

  const typeRows: TypeConfigRow[] = types.map(({ fields: _fields, ...row }) => row);
  const fieldRows: FieldConfigRow[] = types.flatMap((t) => t.fields);

  const templateTypes = configRowsToTemplate(typeRows, fieldRows);

  const rules = await db
    .select()
    .from(relationshipRules)
    .where(eq(relationshipRules.isActive, true));

  return {
    schemaVersion: CURRENT_TEMPLATE_SCHEMA_VERSION,
    key: "live-export",
    name: "Live Configuration Export",
    version: "1.0.0",
    description: "Exported live meta-model configuration.",
    types: templateTypes,
    relationshipRules: rules.map((r) => ({
      sourceTypeKey: r.sourceTypeKey,
      targetTypeKey: r.targetTypeKey,
      relationshipType: r.relationshipType,
      reverseLabel: r.reverseLabel ?? undefined,
      description: r.description ?? undefined,
    })),
  };
}

// ── Import (write template into the config tables) ─────────────────────────────

/**
 * Write a template's types + fields into the config tables.
 *
 * - `replace` (default): remove every existing type/field first, then insert.
 * - `merge`: upsert each type by typeKey; replace that type's fields.
 *
 * Relationship rules from the template are applied in replace mode only.
 */
export async function importTemplateToConfig(
  template: MetaModelTemplate,
  mode: "merge" | "replace" = "replace"
): Promise<void> {
  if (mode === "replace") {
    // Fields cascade-delete with their type; delete types explicitly.
    await db.delete(documentFieldConfigs);
    await db.delete(documentTypeConfigs);
  }

  for (const t of template.types) {
    let typeConfigId: string;

    if (mode === "merge") {
      const [existing] = await db
        .select({ id: documentTypeConfigs.id })
        .from(documentTypeConfigs)
        .where(eq(documentTypeConfigs.typeKey, t.typeKey))
        .limit(1);

      if (existing) {
        await db
          .update(documentTypeConfigs)
          .set({
            slug: t.slug,
            displayName: t.displayName,
            pluralName: t.pluralName,
            icon: t.icon,
            isHierarchical: t.isHierarchical,
            milestonesEnabled: t.milestonesEnabled,
            sortOrder: t.sortOrder,
            isActive: true,
          })
          .where(eq(documentTypeConfigs.id, existing.id));
        typeConfigId = existing.id;
        // Replace this type's fields wholesale.
        await db
          .delete(documentFieldConfigs)
          .where(eq(documentFieldConfigs.typeConfigId, typeConfigId));
      } else {
        typeConfigId = await insertType(t);
      }
    } else {
      typeConfigId = await insertType(t);
    }

    if (t.fields.length > 0) {
      await db.insert(documentFieldConfigs).values(
        t.fields.map((f) => ({
          typeConfigId,
          fieldKey: f.fieldKey,
          fieldSource: f.fieldSource,
          label: f.label,
          dataType: f.dataType,
          fieldType: f.fieldType ?? "text",
          enabled: f.enabled,
          required: f.required,
          options: f.options ?? undefined,
          group: f.group ?? undefined,
          placeholder: f.placeholder ?? undefined,
          helpText: f.helpText ?? undefined,
          searchable: f.searchable,
          filterable: f.filterable,
          showInList: f.showInList,
          sortOrder: f.sortOrder,
        }))
      );
    }
  }

  if (mode === "replace" && template.relationshipRules.length > 0) {
    await db.delete(relationshipRules);
    await db.insert(relationshipRules).values(
      template.relationshipRules.map((r) => ({
        sourceTypeKey: r.sourceTypeKey,
        targetTypeKey: r.targetTypeKey,
        relationshipType: r.relationshipType,
        reverseLabel: r.reverseLabel ?? undefined,
        description: r.description ?? undefined,
      }))
    );
  }
}

async function insertType(t: TemplateType): Promise<string> {
  const [row] = await db
    .insert(documentTypeConfigs)
    .values({
      typeKey: t.typeKey,
      slug: t.slug,
      displayName: t.displayName,
      pluralName: t.pluralName,
      icon: t.icon,
      isHierarchical: t.isHierarchical,
      milestonesEnabled: t.milestonesEnabled,
      sortOrder: t.sortOrder,
      isActive: true,
    })
    .returning({ id: documentTypeConfigs.id });
  return row.id;
}

// ── Apply / reset orchestration ────────────────────────────────────────────────

/**
 * Apply a template to the live config in the given mode, then mark it the sole
 * active template. Invalidates the registry cache. Accepts either a parsed
 * template or raw JSON (validated via `parseTemplate`).
 */
export async function applyTemplate(
  template: MetaModelTemplate | unknown,
  mode: "merge" | "replace" = "replace"
): Promise<MetaModelTemplate> {
  const parsed = isTemplate(template) ? template : parseTemplate(template);

  await importTemplateToConfig(parsed, mode);

  // Mark this template active, all others inactive.
  await db.update(metamodelTemplates).set({ isActive: false });
  await db
    .update(metamodelTemplates)
    .set({ isActive: true, appliedAt: new Date() })
    .where(eq(metamodelTemplates.key, parsed.key));

  invalidateRegistry();
  return parsed;
}

/**
 * Destructive reset to a stored template: delete all documents and the entire
 * live config, then re-apply the template in replace mode. Invalidates the
 * registry cache. Throws if the template key is unknown.
 */
export async function resetToTemplate(templateKey: string): Promise<MetaModelTemplate> {
  const [row] = await db
    .select()
    .from(metamodelTemplates)
    .where(eq(metamodelTemplates.key, templateKey))
    .limit(1);

  if (!row) {
    throw new Error(`Template '${templateKey}' not found`);
  }

  const template = parseTemplate(row.definition);

  // Destructive: wipe all documents first.
  await db.delete(documents);

  await importTemplateToConfig(template, "replace");

  await db.update(metamodelTemplates).set({ isActive: false });
  await db
    .update(metamodelTemplates)
    .set({ isActive: true, appliedAt: new Date() })
    .where(eq(metamodelTemplates.key, templateKey));

  invalidateRegistry();
  return template;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isTemplate(value: unknown): value is MetaModelTemplate {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { types?: unknown }).types) &&
    typeof (value as { key?: unknown }).key === "string"
  );
}

/** Delete a set of type configs (and their cascading fields) by typeKey. */
export async function deleteTypeConfigsByKey(typeKeys: string[]): Promise<void> {
  if (typeKeys.length === 0) return;
  await db
    .delete(documentTypeConfigs)
    .where(inArray(documentTypeConfigs.typeKey, typeKeys));
}
