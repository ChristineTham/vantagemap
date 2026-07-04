import { describe, it, expect } from "vitest";
import { validateDataSource } from "@/lib/data-source-engine";

describe("validateDataSource", () => {
  it("accepts a single-type source with filters and sort", () => {
    const ds = validateDataSource({
      mode: "single",
      typeKey: "Application",
      filters: [{ field: "health", operator: "in", value: ["Poor", "Critical"] }],
      sort: { field: "name", dir: "asc" },
      limit: 50,
    });
    expect(ds.mode).toBe("single");
  });

  it("accepts an aggregate source with metrics", () => {
    const ds = validateDataSource({
      mode: "aggregate",
      typeKey: "Application",
      groupBy: "timeClassification",
      metrics: [{ operation: "count", alias: "n" }],
    });
    expect(ds.mode).toBe("aggregate");
  });

  it("accepts a join source and caps hops at 2", () => {
    const ds = validateDataSource({
      mode: "join",
      primaryType: "BusinessCapability",
      joins: [
        { relationshipType: "supported by", targetType: "Application", direction: "incoming" },
      ],
    });
    expect(ds.mode).toBe("join");
  });

  it("rejects an unknown mode", () => {
    expect(() => validateDataSource({ mode: "sql", query: "select 1" })).toThrow();
  });

  it("rejects an invalid filter operator", () => {
    expect(() =>
      validateDataSource({
        mode: "single",
        typeKey: "Application",
        filters: [{ field: "x", operator: "regex", value: "y" }],
      })
    ).toThrow();
  });

  it("rejects more than 2 join hops", () => {
    expect(() =>
      validateDataSource({
        mode: "join",
        primaryType: "A",
        joins: [
          { relationshipType: "r", targetType: "B", direction: "outgoing" },
          { relationshipType: "r", targetType: "C", direction: "outgoing" },
          { relationshipType: "r", targetType: "D", direction: "outgoing" },
        ],
      })
    ).toThrow();
  });

  it("rejects aggregate with no metrics", () => {
    expect(() =>
      validateDataSource({ mode: "aggregate", typeKey: "A", groupBy: "health", metrics: [] })
    ).toThrow();
  });
});
