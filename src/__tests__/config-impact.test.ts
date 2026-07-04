import { describe, it, expect } from "vitest";
import { analyzeImpact } from "@/lib/config-impact";

describe("analyzeImpact (referential integrity)", () => {
  it("rename display name is safe with no prompts", () => {
    const r = analyzeImpact("rename_type_label");
    expect(r.severity).toBe("safe");
    expect(r.options).toEqual([]);
    expect(r.requiresTypeConfirm).toBe(false);
  });

  it("rekey type offers retain (default) vs delete and confirms when data exists", () => {
    const r = analyzeImpact("rekey_type", { documents: 12, relationships: 30 });
    expect(r.options[0].key).toBe("retain");
    expect(r.options[0].isDefault).toBe(true);
    expect(r.options.some((o) => o.destructive)).toBe(true);
    expect(r.requiresTypeConfirm).toBe(true);
    expect(r.message).toContain("12");
  });

  it("delete field warns with the value count and requires confirm when values exist", () => {
    const r = analyzeImpact("delete_field", { fieldValues: 7 });
    expect(r.severity).toBe("destructive");
    expect(r.message).toContain("7");
    expect(r.requiresTypeConfirm).toBe(true);
  });

  it("delete field with no values does not require type-confirm", () => {
    const r = analyzeImpact("delete_field", { fieldValues: 0 });
    expect(r.requiresTypeConfirm).toBe(false);
  });

  it("rename field key defaults to retaining values", () => {
    const r = analyzeImpact("rename_field_key", { fieldValues: 3 });
    expect(r.options[0].key).toBe("retain");
    expect(r.options[0].isDefault).toBe(true);
  });

  it("remove relationship rule keeps edges by default", () => {
    const r = analyzeImpact("remove_relationship_rule", { relationships: 5 });
    expect(r.options[0].destructive).toBe(false);
    expect(r.options.some((o) => o.destructive)).toBe(true);
  });

  it("change field type surfaces incompatible-value warnings", () => {
    const r = analyzeImpact("change_field_type", { incompatibleValues: 4 });
    expect(r.warnings.join(" ")).toContain("4");
  });

  it("delete type is destructive and confirms", () => {
    const r = analyzeImpact("delete_type", { documents: 2, relationships: 1 });
    expect(r.severity).toBe("destructive");
    expect(r.requiresTypeConfirm).toBe(true);
  });

  it("every non-safe change with data offers a default option", () => {
    const changes = [
      "rekey_type",
      "delete_field",
      "rename_field_key",
      "remove_option",
      "make_required",
      "remove_relationship_rule",
    ] as const;
    for (const c of changes) {
      const r = analyzeImpact(c, { documents: 1, relationships: 1, fieldValues: 1, optionUses: 1, missingRequired: 1 });
      // When there is an actual retain-vs-delete choice, a non-destructive
      // default must be offered (destructive-only single-option cases exempt).
      if (r.options.length > 1) {
        const def = r.options.find((o) => o.isDefault);
        expect(def).toBeTruthy();
        expect(def!.destructive).toBe(false);
      }
    }
  });
});
