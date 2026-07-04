/**
 * PLANV2 — Referential-integrity impact analysis (pure).
 *
 * Given a proposed meta-model change plus the affected-record counts, returns a
 * structured impact: the human message, the retain-vs-delete data-handling
 * options (default first), warnings, and whether a type-to-confirm is required.
 * The DB counting + transactional apply live in config-apply.ts; this module is
 * pure so it is directly unit-testable.
 */

export type ConfigChangeType =
  | "rename_type_label"
  | "rekey_type"
  | "delete_type"
  | "add_field"
  | "disable_field"
  | "delete_field"
  | "change_field_type"
  | "rename_field_key"
  | "remove_option"
  | "make_required"
  | "remove_relationship_rule";

export interface AffectedCounts {
  documents?: number;
  relationships?: number;
  fieldValues?: number;
  optionUses?: number;
  incompatibleValues?: number;
  missingRequired?: number;
}

export interface DataHandlingOption {
  key: string;
  label: string;
  destructive: boolean;
  isDefault: boolean;
}

export interface ImpactResult {
  change: ConfigChangeType;
  severity: "safe" | "warning" | "destructive";
  message: string;
  options: DataHandlingOption[];
  warnings: string[];
  requiresTypeConfirm: boolean;
}

const retain = (label: string): DataHandlingOption => ({
  key: "retain",
  label,
  destructive: false,
  isDefault: true,
});
const del = (label: string): DataHandlingOption => ({
  key: "delete",
  label,
  destructive: true,
  isDefault: false,
});

/** Analyse the impact of a config change given affected-record counts. */
export function analyzeImpact(change: ConfigChangeType, counts: AffectedCounts = {}): ImpactResult {
  const docs = counts.documents ?? 0;
  const rels = counts.relationships ?? 0;
  const fieldValues = counts.fieldValues ?? 0;

  switch (change) {
    case "rename_type_label":
      return {
        change,
        severity: "safe",
        message: "Renaming the display name is safe — no data is affected.",
        options: [],
        warnings: [],
        requiresTypeConfirm: false,
      };

    case "rekey_type":
      return {
        change,
        severity: "warning",
        message: `${docs} document(s) and ${rels} relationship(s) reference this type.`,
        options: [
          retain("Migrate existing documents & relationships to the new key"),
          del("Delete existing documents of this type (and their relationships)"),
        ],
        warnings: docs > 0 ? ["Machine keys are normally immutable; re-keying rewrites references."] : [],
        requiresTypeConfirm: docs > 0,
      };

    case "delete_type":
      return {
        change,
        severity: "destructive",
        message: `This will delete ${docs} document(s) of this type and ${rels} relationship(s) that reference them.`,
        options: [del("Delete the type, its documents, and their relationships")],
        warnings: ["Related relationship rules for this type are also removed."],
        requiresTypeConfirm: docs > 0,
      };

    case "add_field":
      return {
        change,
        severity: "safe",
        message: "Adding a field is non-destructive. A default value can be backfilled.",
        options: [
          { key: "no_backfill", label: "Add field (no backfill)", destructive: false, isDefault: true },
          { key: "backfill", label: "Add field and backfill the default value", destructive: false, isDefault: false },
        ],
        warnings: [],
        requiresTypeConfirm: false,
      };

    case "disable_field":
      return {
        change,
        severity: "safe",
        message: "Disabling a field hides it but retains stored values.",
        options: [],
        warnings: [],
        requiresTypeConfirm: false,
      };

    case "delete_field":
      return {
        change,
        severity: "destructive",
        message: `${fieldValues} document(s) have a value for this field. Deleting it permanently removes that data.`,
        options: [del("Delete the field and its values")],
        warnings: [],
        requiresTypeConfirm: fieldValues > 0,
      };

    case "change_field_type":
      return {
        change,
        severity: "warning",
        message: `Values that cannot be converted will be removed from ${counts.incompatibleValues ?? 0} document(s).`,
        options: [
          retain("Convert compatible values, drop incompatible ones"),
          { key: "cancel", label: "Cancel", destructive: false, isDefault: false },
        ],
        warnings:
          (counts.incompatibleValues ?? 0) > 0
            ? [`${counts.incompatibleValues} value(s) will be dropped.`]
            : [],
        requiresTypeConfirm: false,
      };

    case "rename_field_key":
      return {
        change,
        severity: "warning",
        message: `${fieldValues} document(s) store data under the old key.`,
        options: [
          retain("Carry existing values across to the new key"),
          del("Drop the values (documents lose this field's data)"),
        ],
        warnings: [],
        requiresTypeConfirm: false,
      };

    case "remove_option":
      return {
        change,
        severity: "warning",
        message: `${counts.optionUses ?? 0} document(s) use the value(s) being removed.`,
        options: [
          { key: "keep", label: "Keep existing values (become non-standard)", destructive: false, isDefault: true },
          del("Clear the removed value(s) from those documents"),
        ],
        warnings: [],
        requiresTypeConfirm: false,
      };

    case "make_required":
      return {
        change,
        severity: "warning",
        message: `${counts.missingRequired ?? 0} document(s) have no value and will fail validation on next edit.`,
        options: [
          { key: "apply", label: "Apply", destructive: false, isDefault: true },
          { key: "backfill", label: "Apply and backfill a default", destructive: false, isDefault: false },
        ],
        warnings: [],
        requiresTypeConfirm: false,
      };

    case "remove_relationship_rule":
      return {
        change,
        severity: "warning",
        message: `${rels} existing relationship(s) were created under this rule.`,
        options: [
          retain("Remove rule, keep existing edges"),
          del(`Remove rule and delete ${rels} edge(s)`),
        ],
        warnings: ["New relationships of this kind can no longer be created."],
        requiresTypeConfirm: false,
      };

    default:
      return {
        change,
        severity: "warning",
        message: "Review this change before applying.",
        options: [retain("Retain existing data")],
        warnings: [],
        requiresTypeConfirm: false,
      };
  }
}
