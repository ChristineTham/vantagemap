/**
 * PLANV2 Phase 7/8 — Shared client-side types for the report and dashboard
 * builders. These are the *editable* form shapes; `toDataSource()` in
 * `DataSourceForm` serialises them into the engine's `dataSource` JSON.
 */

export interface TypeOption {
  typeKey: string;
  slug: string;
  displayName: string;
}

export interface FilterRow {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "in"
    | "not_in"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "is_null"
    | "not_null"
    | "contains";
  value?: string;
}

export interface MetricRow {
  operation: "count" | "count_distinct" | "sum" | "avg" | "min" | "max";
  field?: string;
  alias: string;
}

export interface JoinRow {
  relationshipType: string;
  targetType: string;
  direction: "outgoing" | "incoming";
  include: "items" | "count" | "both";
}

export type DataSourceValue =
  | { mode: "single"; typeKey: string; filters: FilterRow[]; limit?: number }
  | {
      mode: "aggregate";
      typeKey: string;
      filters: FilterRow[];
      groupBy: string;
      metrics: MetricRow[];
    }
  | { mode: "join"; primaryType: string; primaryFilters: FilterRow[]; joins: JoinRow[] };

export function defaultDataSource(firstType: string): DataSourceValue {
  return { mode: "single", typeKey: firstType, filters: [], limit: 50 };
}

/** Turn a name into a URL-safe slug. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
