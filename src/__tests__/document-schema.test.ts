import { describe, it, expect } from "vitest";
import {
  buildDocumentSchema,
  splitDocumentData,
  BUILTIN_DOCUMENT_COLUMNS,
  PROTECTED_DOCUMENT_COLUMNS,
  type FieldConfigLike,
} from "@/lib/document-schema";

const fields: FieldConfigLike[] = [
  { fieldKey: "name", fieldSource: "builtin", dataType: "text", required: true },
  { fieldKey: "description", fieldSource: "builtin", dataType: "textarea", required: false },
  { fieldKey: "maturity", fieldSource: "builtin", dataType: "integer", required: false },
  {
    fieldKey: "lifecycle",
    fieldSource: "builtin",
    dataType: "single_select",
    required: false,
    options: [
      { value: "Active", label: "Active" },
      { value: "Plan", label: "Plan" },
    ],
  },
  { fieldKey: "contractValue", fieldSource: "custom", dataType: "number", required: false },
  {
    fieldKey: "regions",
    fieldSource: "custom",
    dataType: "multi_select",
    required: false,
    options: [
      { value: "EU", label: "EU" },
      { value: "US", label: "US" },
    ],
  },
  { fieldKey: "ownerRef", fieldSource: "custom", dataType: "reference", required: false },
];

describe("buildDocumentSchema", () => {
  it("requires name on create and accepts a valid payload", () => {
    const schema = buildDocumentSchema(fields);
    const parsed = schema.parse({ name: "App A", maturity: "3", lifecycle: "Active" });
    expect(parsed.name).toBe("App A");
    expect(parsed.maturity).toBe(3); // coerced
  });

  it("rejects a missing required name", () => {
    const schema = buildDocumentSchema(fields);
    expect(() => schema.parse({ description: "no name" })).toThrow();
  });

  it("rejects a select value outside its options", () => {
    const schema = buildDocumentSchema(fields);
    expect(() => schema.parse({ name: "x", lifecycle: "Nope" })).toThrow();
  });

  it("rejects an unknown field (strict)", () => {
    const schema = buildDocumentSchema(fields);
    expect(() => schema.parse({ name: "x", bogusField: 1 })).toThrow();
  });

  it("validates reference fields as UUIDs", () => {
    const schema = buildDocumentSchema(fields);
    expect(() => schema.parse({ name: "x", ownerRef: "not-a-uuid" })).toThrow();
    const ok = schema.parse({ name: "x", ownerRef: "12345678-1234-1234-1234-123456789012" });
    expect(ok.ownerRef).toBe("12345678-1234-1234-1234-123456789012");
  });

  it("partial mode makes name optional (PATCH semantics)", () => {
    const schema = buildDocumentSchema(fields, { partial: true });
    expect(() => schema.parse({ maturity: "2" })).not.toThrow();
  });
});

describe("splitDocumentData", () => {
  it("routes custom fields to customFields and built-ins to columns", () => {
    const { columns, customFields } = splitDocumentData(
      { name: "App", maturity: 3, contractValue: 1000, regions: ["EU"] },
      fields
    );
    expect(columns).toEqual({ name: "App", maturity: 3 });
    expect(customFields).toEqual({ contractValue: 1000, regions: ["EU"] });
  });

  it("drops protected fields", () => {
    const { columns, customFields } = splitDocumentData(
      { name: "App", id: "x", typeKey: "Y", qualitySeal: "Approved", createdAt: "now" },
      fields
    );
    expect(columns).toEqual({ name: "App" });
    expect(customFields).toEqual({});
  });
});

describe("column sets", () => {
  it("marks governance-controlled fields as protected", () => {
    expect(PROTECTED_DOCUMENT_COLUMNS.has("qualitySeal")).toBe(true);
    expect(PROTECTED_DOCUMENT_COLUMNS.has("id")).toBe(true);
  });

  it("includes pooled type-specific columns as built-ins", () => {
    for (const key of ["ring", "timeClassification", "budget", "perspective"]) {
      expect(BUILTIN_DOCUMENT_COLUMNS.has(key)).toBe(true);
    }
  });
});
