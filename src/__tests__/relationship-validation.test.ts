import { describe, it, expect } from "vitest";
import {
  isRelationshipAllowed,
  getAllowedRelationshipTypes,
  type RuleLike,
} from "@/lib/relationship-validation";

const rules: RuleLike[] = [
  { sourceTypeKey: "Application", targetTypeKey: "BusinessCapability", relationshipType: "supports", isActive: true },
  { sourceTypeKey: "Application", targetTypeKey: "ITComponent", relationshipType: "runs on", isActive: true },
  { sourceTypeKey: "Initiative", targetTypeKey: "Application", relationshipType: "impacts", isActive: false },
];

describe("relationship validation", () => {
  it("allows a configured active rule", () => {
    expect(isRelationshipAllowed(rules, "Application", "BusinessCapability", "supports")).toBe(true);
  });

  it("rejects a relationship not covered by any rule", () => {
    expect(isRelationshipAllowed(rules, "Application", "Provider", "supports")).toBe(false);
  });

  it("rejects a rule that is inactive", () => {
    expect(isRelationshipAllowed(rules, "Initiative", "Application", "impacts")).toBe(false);
  });

  it("rejects the wrong relationship type between valid types", () => {
    expect(isRelationshipAllowed(rules, "Application", "ITComponent", "supports")).toBe(false);
  });

  it("lists allowed relationship types for a type pair", () => {
    expect(getAllowedRelationshipTypes(rules, "Application", "ITComponent")).toEqual(["runs on"]);
    expect(getAllowedRelationshipTypes(rules, "Application", "Provider")).toEqual([]);
  });

  it("excludes inactive rules from the allowed list", () => {
    expect(getAllowedRelationshipTypes(rules, "Initiative", "Application")).toEqual([]);
  });
});
