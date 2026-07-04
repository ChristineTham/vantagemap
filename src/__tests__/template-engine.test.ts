import { describe, it, expect } from "vitest";
import {
  parseTemplate,
  diffTemplate,
  CURRENT_TEMPLATE_SCHEMA_VERSION,
  type TemplateType,
} from "@/lib/template-engine";
import { buildEnterpriseArchitectureTypes } from "@/lib/templates/enterprise-architecture";

function eaTemplate() {
  return {
    schemaVersion: 1,
    key: "enterprise-architecture",
    name: "Enterprise Architecture",
    version: "1.0.0",
    types: buildEnterpriseArchitectureTypes(),
  };
}

describe("parseTemplate", () => {
  it("parses the built-in EA template round-trip", () => {
    const t = parseTemplate(eaTemplate());
    expect(t.types.length).toBe(13);
    expect(t.key).toBe("enterprise-architecture");
  });

  it("rejects malformed template JSON", () => {
    expect(() => parseTemplate({ key: "x" })).toThrow();
  });

  it("rejects a future schema version", () => {
    expect(() =>
      parseTemplate({ ...eaTemplate(), schemaVersion: CURRENT_TEMPLATE_SCHEMA_VERSION + 1 })
    ).toThrow(/newer than supported/);
  });
});

describe("diffTemplate", () => {
  const base = buildEnterpriseArchitectureTypes() as unknown as TemplateType[];

  it("reports no diff for identical config", () => {
    const d = diffTemplate(base, base);
    expect(d.addedTypes).toEqual([]);
    expect(d.removedTypes).toEqual([]);
    expect(d.changedTypes).toEqual([]);
  });

  it("detects an added type", () => {
    const reduced = base.filter((t) => t.typeKey !== "Decision");
    const d = diffTemplate(reduced, base);
    expect(d.addedTypes).toContain("Decision");
  });

  it("detects a removed type", () => {
    const reduced = base.filter((t) => t.typeKey !== "Decision");
    const d = diffTemplate(base, reduced);
    expect(d.removedTypes).toContain("Decision");
  });

  it("detects a changed field (added + changed)", () => {
    const modified = base.map((t) =>
      t.typeKey === "Application"
        ? {
            ...t,
            fields: [
              ...t.fields.filter((f) => f.fieldKey !== "version"),
              {
                fieldKey: "contractValue",
                fieldSource: "custom" as const,
                label: "Contract Value",
                dataType: "number",
                fieldType: "number",
                enabled: true,
                required: false,
                searchable: false,
                filterable: true,
                showInList: false,
                sortOrder: 99,
              },
            ],
          }
        : t
    );
    const d = diffTemplate(base, modified);
    const appDiff = d.changedTypes.find((c) => c.typeKey === "Application");
    expect(appDiff).toBeTruthy();
    expect(appDiff!.addedFields).toContain("contractValue");
    expect(appDiff!.removedFields).toContain("version");
  });
});
