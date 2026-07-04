/**
 * PLANV3 — Dynamic document validation.
 *
 * Builds a Zod schema at runtime from a document type's field definitions and
 * splits a validated payload into built-in column values vs. custom-field JSONB.
 * Pure functions (no DB) so they are directly unit-testable.
 */

import { z, type ZodTypeAny } from "zod";

/** The set of built-in columns on the `documents` table that a field config may target. */
export const BUILTIN_DOCUMENT_COLUMNS = new Set<string>([
  "name",
  "description",
  "lifecycle",
  "health",
  "qualitySeal",
  "owner",
  "parentId",
  "level",
  "subtype",
  "version",
  "status",
  "perspective",
  "technicalFit",
  "functionalFit",
  "businessCriticality",
  "timeClassification",
  "sixRClassification",
  "technicalStandard",
  "ring",
  "quadrant",
  "maturity",
  "strategicImportance",
  "dataClassification",
  "dataFlowDirection",
  "frequency",
  "endpointUrl",
  "authProtocol",
  "location",
  "contactInfo",
  "startDate",
  "endDate",
  "endOfLife",
  "endOfSupport",
  "budget",
  "decisionStatus",
  "decisionDate",
  "context",
  "decisionOutcome",
  "consequences",
  "supersededById",
]);

/** Server-managed columns that may never be set via a client payload. */
export const PROTECTED_DOCUMENT_COLUMNS = new Set<string>([
  "id",
  "typeKey",
  "qualitySeal",
  "createdAt",
  "updatedAt",
  "customFields",
]);

export type DocumentDataType =
  | "text"
  | "textarea"
  | "number"
  | "integer"
  | "boolean"
  | "date"
  | "datetime"
  | "single_select"
  | "multi_select"
  | "url"
  | "email"
  | "json"
  | "reference";

export interface FieldConfigLike {
  fieldKey: string;
  fieldSource: "builtin" | "custom";
  dataType: DocumentDataType | string;
  required: boolean;
  enabled?: boolean;
  options?: { value: string; label?: string }[] | null;
  validation?: Record<string, unknown> | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Map a field's data type + validation to a base Zod schema. */
function baseSchemaFor(field: FieldConfigLike): ZodTypeAny {
  const v = field.validation ?? {};
  const num = (k: string) => (typeof v[k] === "number" ? (v[k] as number) : undefined);
  const str = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : undefined);
  const optionValues = (field.options ?? []).map((o) => o.value);

  switch (field.dataType) {
    case "number": {
      let s = z.coerce.number();
      if (num("min") !== undefined) s = s.min(num("min")!);
      if (num("max") !== undefined) s = s.max(num("max")!);
      return s;
    }
    case "integer": {
      let s = z.coerce.number().int();
      if (num("min") !== undefined) s = s.min(num("min")!);
      if (num("max") !== undefined) s = s.max(num("max")!);
      return s;
    }
    case "boolean":
      return z.coerce.boolean();
    case "date":
    case "datetime":
      return z.string().min(1);
    case "single_select":
      return optionValues.length > 0
        ? z.string().refine((val) => optionValues.includes(val), {
            message: `Must be one of: ${optionValues.join(", ")}`,
          })
        : z.string();
    case "multi_select":
      return z.array(
        optionValues.length > 0
          ? z.string().refine((val) => optionValues.includes(val))
          : z.string()
      );
    case "url":
      return z.string().url();
    case "email":
      return z.string().email();
    case "json":
      return z.record(z.string(), z.unknown());
    case "reference":
      return z.string().regex(UUID_RE, "Must be a valid document id");
    case "text":
    case "textarea":
    default: {
      let s = z.string();
      if (num("minLength") !== undefined) s = s.min(num("minLength")!);
      if (num("maxLength") !== undefined) s = s.max(num("maxLength")!);
      if (str("pattern")) s = s.regex(new RegExp(str("pattern")!));
      return s;
    }
  }
}

/**
 * Build a Zod object schema from a type's enabled field configs.
 * @param opts.partial when true, all fields are optional (PATCH semantics).
 */
export function buildDocumentSchema(
  fields: FieldConfigLike[],
  opts: { partial?: boolean } = {}
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of fields) {
    if (field.enabled === false) continue;
    if (PROTECTED_DOCUMENT_COLUMNS.has(field.fieldKey)) continue;

    let schema = baseSchemaFor(field);
    if (opts.partial || !field.required) {
      schema = schema.optional().nullable();
    }
    shape[field.fieldKey] = schema;
  }

  // `name` is always allowed/required for create unless partial.
  if (!shape.name && !opts.partial) {
    shape.name = z.string().min(1);
  }

  return z.object(shape).strict();
}

/**
 * Split a validated payload into built-in column values and custom-field values.
 * `field_source: custom` keys land under `customFields`; everything else that is
 * a known built-in column becomes a top-level column value.
 */
export function splitDocumentData(
  data: Record<string, unknown>,
  fields: FieldConfigLike[]
): { columns: Record<string, unknown>; customFields: Record<string, unknown> } {
  const bySource = new Map(fields.map((f) => [f.fieldKey, f.fieldSource]));
  const columns: Record<string, unknown> = {};
  const customFields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (PROTECTED_DOCUMENT_COLUMNS.has(key)) continue;
    const source = bySource.get(key);
    if (source === "custom") {
      customFields[key] = value;
    } else if (BUILTIN_DOCUMENT_COLUMNS.has(key)) {
      columns[key] = value;
    }
    // unknown keys are dropped (schema is strict, so this rarely triggers)
  }

  return { columns, customFields };
}
