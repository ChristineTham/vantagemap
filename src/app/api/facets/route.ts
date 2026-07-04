/**
 * Step 6.3 — Faceted Filter API
 *
 * GET /api/facets — Get available facet values for filtering fact sheets.
 *   Returns distinct values for: type, lifecycle, health, qualitySeal, and tags.
 *   Supports filtering by type to narrow facets.
 *
 * PLANV3 cutover: aggregates over the unified `documents` table (grouping by
 * `type_key`, `lifecycle`, `health`, `quality_seal`) instead of the 12 legacy
 * per-type tables.
 */

import { sql } from "drizzle-orm";
import { db } from "@/db";
// documents is the unified table this route aggregates over (via raw SQL against
// its physical table name). Imported to anchor the PLANV3 schema contract.
import { documents } from "@/db/schema";
import { ok, badRequest, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

void documents;

// ── Types ───────────────────────────────────────────────────────────────────

interface FacetValue {
  value: string;
  count: number;
}

interface FacetGroup {
  field: string;
  values: FacetValue[];
}

// ── Configuration ───────────────────────────────────────────────────────────

/**
 * Valid entity type keys — these are the `type_key` values stored in the
 * unified `documents` table.
 */
const FACETABLE_TYPES = [
  "BusinessCapability",
  "Organization",
  "BusinessContext",
  "Application",
  "DataObject",
  "Interface",
  "StrategicObjective",
  "Initiative",
  "Platform",
  "TechCategory",
  "ITComponent",
  "Provider",
] as const;

const VALID_TYPES = new Set<string>(FACETABLE_TYPES);

function sqlList(values: readonly string[]): string {
  return values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
}

// ── GET /api/facets ─────────────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);
  const typesParam = url.searchParams.get("types");

  let typesToQuery: string[] = [...FACETABLE_TYPES];
  if (typesParam) {
    const requestedTypes = typesParam.split(",").map((t) => t.trim());
    const invalidTypes = requestedTypes.filter((t) => !VALID_TYPES.has(t));
    if (invalidTypes.length > 0) {
      return badRequest(`Invalid entity types: ${invalidTypes.join(", ")}`);
    }
    typesToQuery = requestedTypes;
  }

  const typeFilter = `type_key IN (${sqlList(typesToQuery)})`;

  // Build facet queries
  const facets: FacetGroup[] = [];

  // Type facet — count per entity type
  const typeResults = (
    await db.execute(
      sql.raw(
        `SELECT type_key AS value, COUNT(*)::int AS count FROM documents WHERE ${typeFilter} GROUP BY type_key ORDER BY count DESC`
      )
    )
  ).rows as unknown as FacetValue[];
  facets.push({
    field: "type",
    values: typeResults.filter((r) => r.count > 0),
  });

  // Lifecycle facet
  const lifecycleRaw = (
    await db.execute(
      sql.raw(
        `SELECT lifecycle AS value, COUNT(*)::int AS count FROM documents WHERE ${typeFilter} AND lifecycle IS NOT NULL GROUP BY lifecycle ORDER BY count DESC`
      )
    )
  ).rows as unknown as FacetValue[];
  facets.push({ field: "lifecycle", values: lifecycleRaw });

  // Health facet
  const healthRaw = (
    await db.execute(
      sql.raw(
        `SELECT health AS value, COUNT(*)::int AS count FROM documents WHERE ${typeFilter} AND health IS NOT NULL GROUP BY health ORDER BY count DESC`
      )
    )
  ).rows as unknown as FacetValue[];
  facets.push({ field: "health", values: healthRaw });

  // Quality seal facet
  const sealRaw = (
    await db.execute(
      sql.raw(
        `SELECT quality_seal AS value, COUNT(*)::int AS count FROM documents WHERE ${typeFilter} AND quality_seal IS NOT NULL GROUP BY quality_seal ORDER BY count DESC`
      )
    )
  ).rows as unknown as FacetValue[];
  facets.push({ field: "qualitySeal", values: sealRaw });

  // Tags facet — count distinct tags assigned to entities of selected types
  const tagQuery = `
    SELECT t.name AS value, COUNT(DISTINCT ta.fact_sheet_id)::int AS count
    FROM tag_assignments ta
    JOIN tags t ON ta.tag_id = t.id
    WHERE ta.fact_sheet_type IN (${sqlList(typesToQuery)})
    GROUP BY t.name
    ORDER BY count DESC
    LIMIT 50
  `;
  const tagResults = (await db.execute(sql.raw(tagQuery))).rows as unknown as FacetValue[];
  facets.push({ field: "tags", values: tagResults });

  return ok({ facets });
});
