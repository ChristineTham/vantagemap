import { describe, it, expect } from "vitest";
import { buildEnterpriseArchitectureTypes } from "@/lib/templates/enterprise-architecture";
import { BUILTIN_DOCUMENT_COLUMNS } from "@/lib/document-schema";

describe("Enterprise Architecture template", () => {
  const types = buildEnterpriseArchitectureTypes();

  it("produces the 12 legacy types plus Decision", () => {
    expect(types.length).toBe(13);
    const keys = types.map((t) => t.typeKey);
    expect(keys).toContain("Application");
    expect(keys).toContain("BusinessCapability");
    expect(keys).toContain("Decision");
  });

  it("has unique type keys and slugs", () => {
    const keys = types.map((t) => t.typeKey);
    const slugs = types.map((t) => t.slug);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("classifies pooled columns as builtin and unknown keys as custom", () => {
    const app = types.find((t) => t.typeKey === "Application")!;
    const techFit = app.fields.find((f) => f.fieldKey === "technicalFit")!;
    expect(techFit.fieldSource).toBe("builtin");
    expect(techFit.dataType).toBe("single_select");

    // A legacy relationship-ish *Id key that is not a column → custom reference
    const itc = types.find((t) => t.typeKey === "ITComponent")!;
    const providerRef = itc.fields.find((f) => f.fieldKey === "providerId");
    if (providerRef) {
      expect(providerRef.fieldSource).toBe("custom");
      expect(providerRef.dataType).toBe("reference");
    }
  });

  it("maps numeric and uuid columns to correct data types", () => {
    const cap = types.find((t) => t.typeKey === "BusinessCapability")!;
    expect(cap.fields.find((f) => f.fieldKey === "maturity")?.dataType).toBe("integer");
    expect(cap.fields.find((f) => f.fieldKey === "parentId")?.dataType).toBe("reference");
    const init = types.find((t) => t.typeKey === "Initiative")!;
    expect(init.fields.find((f) => f.fieldKey === "budget")?.dataType).toBe("number");
    expect(init.milestonesEnabled).toBe(true);
  });

  it("only assigns builtin source to real document columns", () => {
    for (const t of types) {
      for (const f of t.fields) {
        if (f.fieldSource === "builtin") {
          expect(BUILTIN_DOCUMENT_COLUMNS.has(f.fieldKey)).toBe(true);
        }
      }
    }
  });

  it("gives the Decision type its workflow fields", () => {
    const decision = types.find((t) => t.typeKey === "Decision")!;
    const status = decision.fields.find((f) => f.fieldKey === "decisionStatus")!;
    expect(status.dataType).toBe("single_select");
    expect(status.options?.map((o) => o.value)).toContain("Accepted");
  });
});
