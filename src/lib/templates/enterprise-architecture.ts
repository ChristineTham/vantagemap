/**
 * PLANV3 — Built-in "Enterprise Architecture" meta-model template.
 *
 * Derives document type + field configuration from the legacy FACT_SHEET_CONFIGS
 * so the LeanIX-style model is reproduced in the dynamic system, and adds a
 * first-class Decision type. Also provides a seed helper that materialises the
 * config into the `document_type_configs` / `document_field_configs` tables.
 */

import { FACT_SHEET_CONFIGS, type FieldDefinition } from "@/lib/fact-sheet-config";
import { BUILTIN_DOCUMENT_COLUMNS } from "@/lib/document-schema";

export interface TemplateFieldConfig {
  fieldKey: string;
  fieldSource: "builtin" | "custom";
  label: string;
  dataType: string;
  fieldType: string;
  enabled: boolean;
  required: boolean;
  options?: { value: string; label: string }[] | null;
  group?: string | null;
  placeholder?: string | null;
  helpText?: string | null;
  searchable: boolean;
  filterable: boolean;
  showInList: boolean;
  sortOrder: number;
}

export interface TemplateTypeConfig {
  typeKey: string;
  slug: string;
  displayName: string;
  pluralName: string;
  icon: string;
  isHierarchical: boolean;
  milestonesEnabled: boolean;
  sortOrder: number;
  fields: TemplateFieldConfig[];
}

// Columns that must use a specific data type regardless of the legacy hint.
const NUMERIC_INT_COLUMNS = new Set(["level", "maturity", "strategicImportance"]);
const NUMERIC_COLUMNS = new Set(["budget"]);
const UUID_COLUMNS = new Set(["parentId", "supersededById"]);
const HIERARCHY_TYPES = new Set([
  "BusinessCapability",
  "Organization",
  "BusinessContext",
  "StrategicObjective",
  "Initiative",
  "TechCategory",
]);

function dataTypeFor(field: FieldDefinition): string {
  if (NUMERIC_INT_COLUMNS.has(field.key)) return "integer";
  if (NUMERIC_COLUMNS.has(field.key)) return "number";
  if (UUID_COLUMNS.has(field.key)) return "reference";
  // Legacy *Id reference-ish keys that aren't columns → reference custom fields
  if (field.key.endsWith("Id") && !BUILTIN_DOCUMENT_COLUMNS.has(field.key)) return "reference";
  switch (field.type) {
    case "select":
      return "single_select";
    case "textarea":
      return "textarea";
    case "date":
      return "date";
    case "number":
      return "number";
    case "url":
      return "url";
    case "json":
      return "json";
    default:
      return "text";
  }
}

function toFieldConfig(field: FieldDefinition, index: number): TemplateFieldConfig {
  const dataType = dataTypeFor(field);
  const fieldSource = BUILTIN_DOCUMENT_COLUMNS.has(field.key) ? "builtin" : "custom";
  return {
    fieldKey: field.key,
    fieldSource,
    label: field.label,
    dataType,
    fieldType: field.type,
    enabled: true,
    required: field.required ?? false,
    options: field.options ? field.options.map((o) => ({ value: o, label: o })) : null,
    group: field.group ?? null,
    placeholder: field.placeholder ?? null,
    helpText: field.helpText ?? null,
    searchable: field.key === "name" || field.key === "description",
    filterable: dataType === "single_select" || ["lifecycle", "health", "owner"].includes(field.key),
    showInList: ["name", "lifecycle", "health", "owner"].includes(field.key),
    sortOrder: index,
  };
}

/** Decision type — added on top of the legacy 12 types. */
const DECISION_TYPE: TemplateTypeConfig = {
  typeKey: "Decision",
  slug: "decisions",
  displayName: "Decision",
  pluralName: "Decisions",
  icon: "Gavel",
  isHierarchical: false,
  milestonesEnabled: false,
  sortOrder: 100,
  fields: [
    { key: "name", label: "Title", type: "text", required: true, group: "General" },
    { key: "description", label: "Summary", type: "textarea", group: "General" },
    {
      key: "decisionStatus",
      label: "Status",
      type: "select",
      options: ["Proposed", "Under Review", "Accepted", "Rejected", "Superseded", "Deprecated"],
      group: "Workflow",
    },
    { key: "decisionDate", label: "Decision Date", type: "date", group: "Workflow" },
    { key: "context", label: "Context", type: "textarea", group: "Record" },
    { key: "decisionOutcome", label: "Decision", type: "textarea", group: "Record" },
    { key: "consequences", label: "Consequences", type: "textarea", group: "Record" },
    { key: "owner", label: "Owner", type: "text", group: "Governance" },
  ].map((f, i) => toFieldConfig(f as FieldDefinition, i)),
};

/** Build the full Enterprise Architecture type/field configuration. */
export function buildEnterpriseArchitectureTypes(): TemplateTypeConfig[] {
  const fromLegacy = FACT_SHEET_CONFIGS.map((cfg, idx): TemplateTypeConfig => {
    // Icon fallbacks for a couple of Lucide names not present in registry
    return {
      typeKey: cfg.type,
      slug: cfg.slug,
      displayName: cfg.displayName,
      pluralName: cfg.pluralName,
      icon: cfg.icon,
      isHierarchical: HIERARCHY_TYPES.has(cfg.type),
      milestonesEnabled: cfg.type === "Initiative",
      sortOrder: idx,
      fields: cfg.fields.map((f, i) => toFieldConfig(f, i)),
    };
  });
  return [...fromLegacy, DECISION_TYPE];
}
