/**
 * PLANV3 — Data-source engine.
 *
 * Executes a report/dashboard data-source configuration against the unified
 * `documents` + `relationships` tables. Three modes:
 *   - single:    documents of one type with filters
 *   - join:      primary type + 1–2 relationship hops
 *   - aggregate: group-by a field with count/sum/avg/min/max
 *
 * `validateDataSource` is pure and unit-testable; `executeDataSource` runs the
 * queries with guardrails (2-hop max, row cap, safe operators).
 */

import { z } from "zod";
import { and, eq, inArray, sql, count as drizzleCount, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { documents, relationships } from "@/db/schema";

// ── Config schema (pure, validated) ───────────────────────────────────────────

const filterSchema = z.object({
  field: z.string(),
  operator: z.enum([
    "eq",
    "neq",
    "in",
    "not_in",
    "gt",
    "gte",
    "lt",
    "lte",
    "is_null",
    "not_null",
    "contains",
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string()), z.null()]).optional(),
});

const singleSchema = z.object({
  mode: z.literal("single"),
  typeKey: z.string(),
  filters: z.array(filterSchema).optional(),
  sort: z.object({ field: z.string(), dir: z.enum(["asc", "desc"]) }).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

const joinSchema = z.object({
  mode: z.literal("join"),
  primaryType: z.string(),
  primaryFilters: z.array(filterSchema).optional(),
  joins: z
    .array(
      z.object({
        relationshipType: z.string(),
        targetType: z.string(),
        direction: z.enum(["outgoing", "incoming"]),
        include: z.enum(["items", "count", "both"]).default("both"),
      })
    )
    .min(1)
    .max(2),
});

const aggregateSchema = z.object({
  mode: z.literal("aggregate"),
  typeKey: z.string(),
  filters: z.array(filterSchema).optional(),
  groupBy: z.string(),
  metrics: z
    .array(
      z.object({
        operation: z.enum(["count", "sum", "avg", "min", "max", "count_distinct"]),
        field: z.string().optional(),
        alias: z.string(),
      })
    )
    .min(1),
});

export const dataSourceSchema = z.discriminatedUnion("mode", [
  singleSchema,
  joinSchema,
  aggregateSchema,
]);

export type DataSource = z.infer<typeof dataSourceSchema>;
export type FilterCondition = z.infer<typeof filterSchema>;

/** Validate a data-source config. Returns the parsed config or throws ZodError. */
export function validateDataSource(input: unknown): DataSource {
  return dataSourceSchema.parse(input);
}

const MAX_ROWS = 1000;

/** Columns filterable/sortable/groupable on the documents table. */
function docColumn(field: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const col = (documents as any)[field];
  return col ?? null;
}

function filterToSql(f: FilterCondition): SQL | null {
  const col = docColumn(f.field);
  if (!col) return null;
  switch (f.operator) {
    case "eq":
      return eq(col, f.value as string);
    case "neq":
      return sql`${col} <> ${f.value}`;
    case "in":
      return inArray(col, (f.value as string[]) ?? []);
    case "not_in":
      return sql`${col} NOT IN ${f.value}`;
    case "gt":
      return sql`${col} > ${f.value}`;
    case "gte":
      return sql`${col} >= ${f.value}`;
    case "lt":
      return sql`${col} < ${f.value}`;
    case "lte":
      return sql`${col} <= ${f.value}`;
    case "is_null":
      return sql`${col} IS NULL`;
    case "not_null":
      return sql`${col} IS NOT NULL`;
    case "contains":
      return sql`${col} ILIKE ${"%" + String(f.value) + "%"}`;
    default:
      return null;
  }
}

function buildFilters(typeKey: string, filters?: FilterCondition[]): SQL {
  const conds: SQL[] = [eq(documents.typeKey, typeKey)];
  for (const f of filters ?? []) {
    const c = filterToSql(f);
    if (c) conds.push(c);
  }
  return and(...conds) as SQL;
}

export interface DataSourceResult {
  items: Record<string, unknown>[];
  joined?: Record<string, unknown>;
  aggregates?: Record<string, unknown>[];
}

/** Execute a validated data-source config. */
export async function executeDataSource(config: DataSource): Promise<DataSourceResult> {
  if (config.mode === "single") {
    const where = buildFilters(config.typeKey, config.filters);
    let qb = db
      .select()
      .from(documents)
      .where(where)
      .limit(Math.min(config.limit ?? MAX_ROWS, MAX_ROWS));
    if (config.sort) {
      const col = docColumn(config.sort.field);
      if (col) qb = qb.orderBy(config.sort.dir === "desc" ? sql`${col} DESC` : col) as typeof qb;
    }
    const items = await qb;
    return { items };
  }

  if (config.mode === "aggregate") {
    const where = buildFilters(config.typeKey, config.filters);
    const groupCol = docColumn(config.groupBy);
    if (!groupCol) return { items: [], aggregates: [] };

    const selects: Record<string, SQL> = { group: sql`${groupCol}` };
    for (const m of config.metrics) {
      const fieldCol = m.field ? docColumn(m.field) : null;
      switch (m.operation) {
        case "count":
          selects[m.alias] = sql`count(*)`;
          break;
        case "count_distinct":
          selects[m.alias] = fieldCol ? sql`count(distinct ${fieldCol})` : sql`count(*)`;
          break;
        case "sum":
          selects[m.alias] = fieldCol ? sql`coalesce(sum(${fieldCol}::numeric), 0)` : sql`0`;
          break;
        case "avg":
          selects[m.alias] = fieldCol ? sql`avg(${fieldCol}::numeric)` : sql`null`;
          break;
        case "min":
          selects[m.alias] = fieldCol ? sql`min(${fieldCol})` : sql`null`;
          break;
        case "max":
          selects[m.alias] = fieldCol ? sql`max(${fieldCol})` : sql`null`;
          break;
      }
    }
    const rows = await db
      .select(selects)
      .from(documents)
      .where(where)
      .groupBy(groupCol)
      .limit(MAX_ROWS);
    return { items: [], aggregates: rows as Record<string, unknown>[] };
  }

  // join mode
  const where = buildFilters(config.primaryType, config.primaryFilters);
  const primary = await db.select().from(documents).where(where).limit(MAX_ROWS);
  const primaryIds = primary.map((p) => p.id);

  const items: Record<string, unknown>[] = primary.map((p) => ({ ...p }));
  if (primaryIds.length === 0) return { items };

  for (const join of config.joins) {
    const isOutgoing = join.direction === "outgoing";
    const anchorCol = isOutgoing ? relationships.sourceId : relationships.targetId;
    const otherCol = isOutgoing ? relationships.targetId : relationships.sourceId;

    const edges = await db
      .select({ anchor: anchorCol, other: otherCol })
      .from(relationships)
      .where(
        and(
          inArray(anchorCol, primaryIds),
          eq(relationships.relationshipType, join.relationshipType as never)
        )
      );

    const relatedIds = [...new Set(edges.map((e) => e.other))];
    const related =
      relatedIds.length > 0
        ? await db
            .select()
            .from(documents)
            .where(and(inArray(documents.id, relatedIds), eq(documents.typeKey, join.targetType)))
            .limit(MAX_ROWS)
        : [];
    const relatedById = new Map(related.map((r) => [r.id, r]));

    const byAnchor = new Map<string, unknown[]>();
    for (const e of edges) {
      const doc = relatedById.get(e.other);
      if (!doc) continue;
      const list = byAnchor.get(e.anchor) ?? [];
      list.push(doc);
      byAnchor.set(e.anchor, list);
    }

    for (const item of items) {
      const rel = byAnchor.get(item.id as string) ?? [];
      const key = `related_${join.targetType}`;
      if (join.include === "count") item[`${key}_count`] = rel.length;
      else if (join.include === "items") item[key] = rel;
      else {
        item[key] = rel;
        item[`${key}_count`] = rel.length;
      }
    }
  }

  return { items };
}

// Re-export for callers needing a count helper
export { drizzleCount };
