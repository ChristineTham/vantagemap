/**
 * PLANV3 Phase 4/5/14 — Meta-model config apply + counting helpers.
 *
 * The pure helpers (slug generation, reserved-key validation) are extracted so
 * they can be unit-tested without a database. The DB-backed counting helpers
 * feed `analyzeImpact` (config-impact.ts) and the `applyConfigChange` executor
 * performs the config mutation plus the chosen data-handling in a best-effort
 * sequence (Neon HTTP has no interactive transactions).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, count, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  documents,
  relationships,
  documentTypeConfigs,
  documentFieldConfigs,
  relationshipRules,
} from "@/db/schema";
import { BUILTIN_DOCUMENT_COLUMNS } from "@/lib/document-schema";
import { analyzeImpact, type ConfigChangeType, type ImpactResult } from "@/lib/config-impact";

// ── Reserved keys ─────────────────────────────────────────────────────────────

/**
 * Field keys that may never be used for a configurable field — they map to
 * server-managed columns on the `documents` table.
 */
export const RESERVED_FIELD_KEYS = new Set<string>([
  "id",
  "typeKey",
  "createdAt",
  "updatedAt",
  "customFields",
]);

/** True when `fieldKey` collides with a reserved/server-managed column. */
export function isReservedFieldKey(fieldKey: string): boolean {
  return RESERVED_FIELD_KEYS.has(fieldKey);
}

/**
 * Classify a field key as a built-in column or a custom (JSONB) field.
 * Reserved keys are rejected by returning `null`.
 */
export function classifyFieldSource(fieldKey: string): "builtin" | "custom" | null {
  if (isReservedFieldKey(fieldKey)) return null;
  return BUILTIN_DOCUMENT_COLUMNS.has(fieldKey) ? "builtin" : "custom";
}

// ── Slug / key generation ─────────────────────────────────────────────────────

/**
 * Turn an arbitrary label into a URL-safe slug: lowercase, non-alphanumerics
 * collapsed to single hyphens, trimmed of leading/trailing hyphens.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Validate a slug: lowercase alphanumerics and single hyphens, 1–100 chars. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 1 && slug.length <= 100;
}

/**
 * Turn an arbitrary label into a camelCase-ish machine type key
 * (e.g. "Business Capability" → "businessCapability").
 */
export function keyify(input: string): string {
  const words = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  return words
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("");
}

/** Validate a machine type key: starts with a letter, alphanumerics only. */
export function isValidTypeKey(key: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(key) && key.length <= 100;
}

// ── DB counting helpers ───────────────────────────────────────────────────────

/** Count documents of a given type key. */
export async function countDocumentsOfType(typeKey: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(documents)
    .where(eq(documents.typeKey, typeKey));
  return row?.n ?? 0;
}

/**
 * Count relationships that reference a document type key on either endpoint.
 * Relationship endpoints store the type key in the `source_type`/`target_type`
 * columns (an enum column reused for document type keys).
 */
export async function countRelationshipsForType(typeKey: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(relationships)
    .where(
      or(
        eq(relationships.sourceType, typeKey as any),
        eq(relationships.targetType, typeKey as any)
      )
    );
  return row?.n ?? 0;
}

/** Count relationships created under a specific rule (source/target/type triple). */
export async function countRelationshipsForRule(rule: {
  sourceTypeKey: string;
  targetTypeKey: string;
  relationshipType: string;
}): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(relationships)
    .where(
      and(
        eq(relationships.sourceType, rule.sourceTypeKey as any),
        eq(relationships.targetType, rule.targetTypeKey as any),
        eq(relationships.relationshipType, rule.relationshipType as any)
      )
    );
  return row?.n ?? 0;
}

/**
 * Count documents that hold a non-null value for a field. Built-in columns are
 * counted directly; custom fields are counted via a JSONB key-existence probe.
 */
export async function countFieldValues(typeKey: string, fieldKey: string): Promise<number> {
  const source = classifyFieldSource(fieldKey);
  if (source === "builtin") {
    const [row] = await db
      .select({ n: count() })
      .from(documents)
      .where(
        and(
          eq(documents.typeKey, typeKey),
          sql`${sql.identifier(camelToSnake(fieldKey))} is not null`
        )
      );
    return row?.n ?? 0;
  }
  // custom field — probe the JSONB blob for key existence
  const [row] = await db
    .select({ n: count() })
    .from(documents)
    .where(
      and(
        eq(documents.typeKey, typeKey),
        sql`${documents.customFields} ? ${fieldKey}`
      )
    );
  return row?.n ?? 0;
}

/** camelCase → snake_case for mapping a built-in field key to its DB column. */
export function camelToSnake(key: string): string {
  return key
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2") // split runs of capitals (e.g. "sixR|Classification")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

// ── Impact analysis (DB-backed wrapper) ───────────────────────────────────────

export interface ImpactRequest {
  change: ConfigChangeType;
  typeKey?: string;
  fieldKey?: string;
  rule?: { sourceTypeKey: string; targetTypeKey: string; relationshipType: string };
}

/**
 * Gather affected-record counts from the DB for a proposed change and run the
 * pure `analyzeImpact`. Read-only.
 */
export async function computeImpact(req: ImpactRequest): Promise<ImpactResult> {
  const { change, typeKey, fieldKey, rule } = req;

  switch (change) {
    case "rekey_type":
    case "delete_type": {
      if (!typeKey) return analyzeImpact(change, {});
      const [documentsN, relationshipsN] = await Promise.all([
        countDocumentsOfType(typeKey),
        countRelationshipsForType(typeKey),
      ]);
      return analyzeImpact(change, { documents: documentsN, relationships: relationshipsN });
    }

    case "delete_field":
    case "rename_field_key": {
      if (!typeKey || !fieldKey) return analyzeImpact(change, {});
      const fieldValues = await countFieldValues(typeKey, fieldKey);
      return analyzeImpact(change, { fieldValues });
    }

    case "change_field_type": {
      if (!typeKey || !fieldKey) return analyzeImpact(change, {});
      const incompatibleValues = await countFieldValues(typeKey, fieldKey);
      return analyzeImpact(change, { incompatibleValues });
    }

    case "make_required": {
      if (!typeKey || !fieldKey) return analyzeImpact(change, {});
      const withValue = await countFieldValues(typeKey, fieldKey);
      const total = await countDocumentsOfType(typeKey);
      return analyzeImpact(change, { missingRequired: Math.max(total - withValue, 0) });
    }

    case "remove_option": {
      if (!typeKey || !fieldKey) return analyzeImpact(change, {});
      const optionUses = await countFieldValues(typeKey, fieldKey);
      return analyzeImpact(change, { optionUses });
    }

    case "remove_relationship_rule": {
      if (!rule) return analyzeImpact(change, {});
      const relationshipsN = await countRelationshipsForRule(rule);
      return analyzeImpact(change, { relationships: relationshipsN });
    }

    // rename_type_label, add_field, disable_field — no DB counting needed.
    default:
      return analyzeImpact(change, {});
  }
}

// ── Apply executor ────────────────────────────────────────────────────────────

export interface ApplyRequest extends ImpactRequest {
  /** Chosen data-handling option key (e.g. "retain" | "delete"). */
  dataHandling: string;
  /** New display name / label (rename_type_label). */
  newLabel?: string;
  /** New type key (rekey_type). */
  newTypeKey?: string;
  /** New field key (rename_field_key). */
  newFieldKey?: string;
}

export interface ApplyResult {
  change: ConfigChangeType;
  dataHandling: string;
  configChanged: boolean;
  documentsAffected: number;
  relationshipsAffected: number;
  typeConfigId?: string;
  message: string;
}

/**
 * Execute a config change plus the chosen data-handling. Neon HTTP has no
 * interactive transactions, so the config mutation is applied first, then the
 * data change (best-effort). Callers must `invalidateRegistry()` + audit.
 */
export async function applyConfigChange(req: ApplyRequest): Promise<ApplyResult> {
  const { change, typeKey, fieldKey, rule, dataHandling } = req;
  const destructive = dataHandling === "delete";
  let documentsAffected = 0;
  let relationshipsAffected = 0;
  let configChanged = false;
  let typeConfigId: string | undefined;

  switch (change) {
    case "rename_type_label": {
      if (!typeKey || !req.newLabel) break;
      const res = await db
        .update(documentTypeConfigs)
        .set({ displayName: req.newLabel })
        .where(eq(documentTypeConfigs.typeKey, typeKey))
        .returning({ id: documentTypeConfigs.id });
      typeConfigId = res[0]?.id;
      configChanged = res.length > 0;
      break;
    }

    case "rekey_type": {
      if (!typeKey || !req.newTypeKey) break;
      // 1. Config change: rewrite the type key + slug.
      const res = await db
        .update(documentTypeConfigs)
        .set({ typeKey: req.newTypeKey, slug: slugify(req.newTypeKey) })
        .where(eq(documentTypeConfigs.typeKey, typeKey))
        .returning({ id: documentTypeConfigs.id });
      typeConfigId = res[0]?.id;
      configChanged = res.length > 0;

      // 2. Data handling.
      if (destructive) {
        relationshipsAffected = await deleteRelationshipsForType(typeKey);
        const del = await db
          .delete(documents)
          .where(eq(documents.typeKey, typeKey))
          .returning({ id: documents.id });
        documentsAffected = del.length;
      } else {
        // Migrate references to the new key.
        const upd = await db
          .update(documents)
          .set({ typeKey: req.newTypeKey })
          .where(eq(documents.typeKey, typeKey))
          .returning({ id: documents.id });
        documentsAffected = upd.length;
        relationshipsAffected = await rekeyRelationships(typeKey, req.newTypeKey);
      }
      break;
    }

    case "delete_type": {
      if (!typeKey) break;
      relationshipsAffected = await deleteRelationshipsForType(typeKey);
      const delDocs = await db
        .delete(documents)
        .where(eq(documents.typeKey, typeKey))
        .returning({ id: documents.id });
      documentsAffected = delDocs.length;
      // Remove relationship rules referencing this type on either side.
      await db
        .delete(relationshipRules)
        .where(
          or(
            eq(relationshipRules.sourceTypeKey, typeKey),
            eq(relationshipRules.targetTypeKey, typeKey)
          )
        );
      // Remove the type config (cascades to field/page-component configs).
      const delType = await db
        .delete(documentTypeConfigs)
        .where(eq(documentTypeConfigs.typeKey, typeKey))
        .returning({ id: documentTypeConfigs.id });
      typeConfigId = delType[0]?.id;
      configChanged = delType.length > 0;
      break;
    }

    case "disable_field": {
      if (!typeKey || !fieldKey) break;
      configChanged = await setFieldFlag(typeKey, fieldKey, { enabled: false });
      break;
    }

    case "delete_field": {
      if (!typeKey || !fieldKey) break;
      configChanged = await deleteFieldConfig(typeKey, fieldKey);
      if (classifyFieldSource(fieldKey) === "custom") {
        // Strip the key from custom_fields JSONB on all docs of this type.
        const upd = await db
          .update(documents)
          .set({ customFields: sql`${documents.customFields} - ${fieldKey}` })
          .where(
            and(eq(documents.typeKey, typeKey), sql`${documents.customFields} ? ${fieldKey}`)
          )
          .returning({ id: documents.id });
        documentsAffected = upd.length;
      }
      break;
    }

    case "make_required": {
      if (!typeKey || !fieldKey) break;
      configChanged = await setFieldFlag(typeKey, fieldKey, { required: true });
      break;
    }

    case "remove_relationship_rule": {
      if (!rule) break;
      const delRule = await db
        .delete(relationshipRules)
        .where(
          and(
            eq(relationshipRules.sourceTypeKey, rule.sourceTypeKey),
            eq(relationshipRules.targetTypeKey, rule.targetTypeKey),
            eq(relationshipRules.relationshipType, rule.relationshipType)
          )
        )
        .returning({ id: relationshipRules.id });
      configChanged = delRule.length > 0;
      if (destructive) {
        const delEdges = await db
          .delete(relationships)
          .where(
            and(
              eq(relationships.sourceType, rule.sourceTypeKey as any),
              eq(relationships.targetType, rule.targetTypeKey as any),
              eq(relationships.relationshipType, rule.relationshipType as any)
            )
          )
          .returning({ id: relationships.id });
        relationshipsAffected = delEdges.length;
      }
      break;
    }

    // add_field / change_field_type / rename_field_key are applied via the
    // dedicated field CRUD routes; apply here is a no-op acknowledgement.
    default:
      break;
  }

  return {
    change,
    dataHandling,
    configChanged,
    documentsAffected,
    relationshipsAffected,
    typeConfigId,
    message: `Applied ${change} (${dataHandling}).`,
  };
}

// ── Internal apply helpers ────────────────────────────────────────────────────

async function deleteRelationshipsForType(typeKey: string): Promise<number> {
  const del = await db
    .delete(relationships)
    .where(
      or(
        eq(relationships.sourceType, typeKey as any),
        eq(relationships.targetType, typeKey as any)
      )
    )
    .returning({ id: relationships.id });
  return del.length;
}

async function rekeyRelationships(oldKey: string, newKey: string): Promise<number> {
  const srcUpd = await db
    .update(relationships)
    .set({ sourceType: newKey as any })
    .where(eq(relationships.sourceType, oldKey as any))
    .returning({ id: relationships.id });
  const tgtUpd = await db
    .update(relationships)
    .set({ targetType: newKey as any })
    .where(eq(relationships.targetType, oldKey as any))
    .returning({ id: relationships.id });
  const ids = new Set<string>([...srcUpd.map((r) => r.id), ...tgtUpd.map((r) => r.id)]);
  return ids.size;
}

async function setFieldFlag(
  typeKey: string,
  fieldKey: string,
  flags: { enabled?: boolean; required?: boolean }
): Promise<boolean> {
  const [type] = await db
    .select({ id: documentTypeConfigs.id })
    .from(documentTypeConfigs)
    .where(eq(documentTypeConfigs.typeKey, typeKey))
    .limit(1);
  if (!type) return false;
  const res = await db
    .update(documentFieldConfigs)
    .set(flags)
    .where(
      and(
        eq(documentFieldConfigs.typeConfigId, type.id),
        eq(documentFieldConfigs.fieldKey, fieldKey)
      )
    )
    .returning({ id: documentFieldConfigs.id });
  return res.length > 0;
}

async function deleteFieldConfig(typeKey: string, fieldKey: string): Promise<boolean> {
  const [type] = await db
    .select({ id: documentTypeConfigs.id })
    .from(documentTypeConfigs)
    .where(eq(documentTypeConfigs.typeKey, typeKey))
    .limit(1);
  if (!type) return false;
  const res = await db
    .delete(documentFieldConfigs)
    .where(
      and(
        eq(documentFieldConfigs.typeConfigId, type.id),
        eq(documentFieldConfigs.fieldKey, fieldKey)
      )
    )
    .returning({ id: documentFieldConfigs.id });
  return res.length > 0;
}
