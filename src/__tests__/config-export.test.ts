import { describe, it, expect } from "vitest";
import { configRowsToTemplate } from "@/lib/config-export";
import { buildEnterpriseArchitectureTypes } from "@/lib/templates/enterprise-architecture";
import type { TypeConfigRow, FieldConfigRow } from "@/lib/document-registry";

/**
 * Build synthetic config rows (as they would come from the DB) from the
 * Enterprise Architecture template, so we can round-trip them back through the
 * pure `configRowsToTemplate` transform and assert the shape is preserved.
 */
function buildRowsFromEaTemplate(): { typeRows: TypeConfigRow[]; fieldRows: FieldConfigRow[] } {
  const ea = buildEnterpriseArchitectureTypes();
  const now = new Date();
  const typeRows: TypeConfigRow[] = [];
  const fieldRows: FieldConfigRow[] = [];

  ea.forEach((t, ti) => {
    const typeId = `type-${ti}`;
    typeRows.push({
      id: typeId,
      typeKey: t.typeKey,
      slug: t.slug,
      displayName: t.displayName,
      pluralName: t.pluralName,
      icon: t.icon,
      color: null,
      isHierarchical: t.isHierarchical,
      milestonesEnabled: t.milestonesEnabled,
      description: null,
      sortOrder: t.sortOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    t.fields.forEach((f, fi) => {
      fieldRows.push({
        id: `field-${ti}-${fi}`,
        typeConfigId: typeId,
        fieldKey: f.fieldKey,
        fieldSource: f.fieldSource,
        label: f.label,
        dataType: f.dataType,
        fieldType: f.fieldType,
        enabled: f.enabled,
        required: f.required,
        options: f.options ?? null,
        validation: null,
        defaultValue: null,
        searchable: f.searchable,
        filterable: f.filterable,
        showInList: f.showInList,
        placeholder: f.placeholder ?? null,
        helpText: f.helpText ?? null,
        group: f.group ?? null,
        width: "full",
        sortOrder: f.sortOrder,
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  return { typeRows, fieldRows };
}

describe("configRowsToTemplate (pure transform)", () => {
  it("round-trips the Enterprise Architecture config back to template types", () => {
    const ea = buildEnterpriseArchitectureTypes();
    const { typeRows, fieldRows } = buildRowsFromEaTemplate();

    const result = configRowsToTemplate(typeRows, fieldRows);

    expect(result).toHaveLength(ea.length);

    // Types line up by key in sortOrder.
    expect(result.map((t) => t.typeKey)).toEqual(
      [...ea].sort((a, b) => a.sortOrder - b.sortOrder).map((t) => t.typeKey)
    );

    const first = result[0];
    const source = ea.find((t) => t.typeKey === first.typeKey)!;
    expect(first.displayName).toBe(source.displayName);
    expect(first.slug).toBe(source.slug);
    expect(first.pluralName).toBe(source.pluralName);
    expect(first.icon).toBe(source.icon);
    expect(first.isHierarchical).toBe(source.isHierarchical);
    expect(first.fields.map((f) => f.fieldKey)).toEqual(source.fields.map((f) => f.fieldKey));
  });

  it("groups fields by their owning type and preserves field metadata", () => {
    const { typeRows, fieldRows } = buildRowsFromEaTemplate();
    const result = configRowsToTemplate(typeRows, fieldRows);

    const decision = result.find((t) => t.typeKey === "Decision");
    expect(decision).toBeDefined();

    const status = decision!.fields.find((f) => f.fieldKey === "decisionStatus");
    expect(status).toBeDefined();
    expect(status!.dataType).toBe("single_select");
    expect(status!.options).not.toBeNull();
    expect(status!.options!.length).toBeGreaterThan(0);
    expect(status!.options![0]).toHaveProperty("value");
    expect(status!.options![0]).toHaveProperty("label");
  });

  it("sorts fields within a type by sortOrder", () => {
    const typeRows: TypeConfigRow[] = [
      {
        id: "t1",
        typeKey: "Thing",
        slug: "things",
        displayName: "Thing",
        pluralName: "Things",
        icon: "FileText",
        color: null,
        isHierarchical: false,
        milestonesEnabled: false,
        description: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const mk = (key: string, sortOrder: number): FieldConfigRow => ({
      id: `f-${key}`,
      typeConfigId: "t1",
      fieldKey: key,
      fieldSource: "builtin",
      label: key,
      dataType: "text",
      fieldType: "text",
      enabled: true,
      required: false,
      options: null,
      validation: null,
      defaultValue: null,
      searchable: false,
      filterable: true,
      showInList: false,
      placeholder: null,
      helpText: null,
      group: null,
      width: "full",
      sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Deliberately out of order.
    const fieldRows = [mk("c", 2), mk("a", 0), mk("b", 1)];

    const [type] = configRowsToTemplate(typeRows, fieldRows);
    expect(type.fields.map((f) => f.fieldKey)).toEqual(["a", "b", "c"]);
  });
});
