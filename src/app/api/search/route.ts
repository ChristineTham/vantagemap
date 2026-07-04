/**
 * Step 6.2 — Cross-Entity Search API
 *
 * GET /api/search — Full-text search across all fact sheet types.
 * Returns results grouped by type with relevance ranking.
 * Uses PostgreSQL ts_rank + to_tsvector/to_tsquery for p95 <300 ms.
 *
 * PLANV3 cutover: searches the unified `documents` table (filtered by
 * `type_key`) instead of the 12 legacy per-type tables.
 *
 * Query parameters:
 *   q        — search query string (required)
 *   types    — comma-separated list of entity types to search (optional, defaults to all)
 *   page     — page number (default 1)
 *   pageSize — results per page (default 25, max 200)
 */

import { sql } from "drizzle-orm";
import { db } from "@/db";
// documents is the unified table this route queries (via raw SQL against its
// physical table name). Imported to anchor the PLANV3 schema contract.
import { documents } from "@/db/schema";
import { ok, badRequest, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { parsePagination, buildPaginationMeta } from "@/lib/query";

void documents;

// ── Types ───────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  lifecycle: string | null;
  health: string | null;
  rank: number;
  headline: string;
}

interface GroupedResults {
  type: string;
  count: number;
  results: SearchResult[];
}

// ── Configuration ───────────────────────────────────────────────────────────

/**
 * Valid entity type keys — these are the `type_key` values stored in the
 * unified `documents` table (formerly the 12 per-type tables).
 */
const SEARCHABLE_TYPES = [
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

const VALID_TYPES = new Set<string>(SEARCHABLE_TYPES);

// ── GET Handler ─────────────────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  if (!query || query.length === 0) {
    return badRequest("Search query parameter 'q' is required");
  }

  if (query.length > 500) {
    return badRequest("Search query too long (max 500 characters)");
  }

  // Parse optional type filter
  const typesParam = url.searchParams.get("types");
  let requestedTypes: string[] = [];
  if (typesParam) {
    requestedTypes = typesParam.split(",").map((t) => t.trim());
    const invalidTypes = requestedTypes.filter((t) => !VALID_TYPES.has(t));
    if (invalidTypes.length > 0) {
      return badRequest(`Invalid entity types: ${invalidTypes.join(", ")}`);
    }
  }

  const pagination = parsePagination(url.searchParams);

  // Restrict to the requested type_key values (or all searchable types)
  const typesToSearch = requestedTypes.length > 0 ? requestedTypes : [...SEARCHABLE_TYPES];
  const typeInList = typesToSearch.map((t) => sanitizeForSql(t)).join(", ");
  const typeFilter = `type_key IN (${typeInList})`;

  // nameOnly mode: substring ILIKE match on name — used by relationship pickers
  // for partial-word search without FTS word-boundary constraints
  const nameOnly = url.searchParams.get("nameOnly") === "true";
  const escapedLike = query.replace(/[%_\\]/g, (c) => `\\${c}`);
  const likePattern = sanitizeForSql(`%${escapedLike}%`);

  const baseSelect = nameOnly
    ? `
      SELECT
        id,
        name,
        description,
        type_key AS entity_type,
        lifecycle::text AS lifecycle,
        health::text AS health,
        0::float AS rank,
        name AS headline
      FROM documents
      WHERE ${typeFilter}
        AND (
          name ILIKE ${likePattern}
          OR coalesce(description, '') ILIKE ${likePattern}
        )
    `
    : `
      SELECT
        id,
        name,
        description,
        type_key AS entity_type,
        lifecycle::text AS lifecycle,
        health::text AS health,
        ts_rank(
          to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')),
          plainto_tsquery('english', ${sanitizeForSql(query)})
        ) AS rank,
        ts_headline(
          'english',
          coalesce(name, '') || ' — ' || coalesce(description, ''),
          plainto_tsquery('english', ${sanitizeForSql(query)}),
          'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20'
        ) AS headline
      FROM documents
      WHERE ${typeFilter}
        AND to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
            @@ plainto_tsquery('english', ${sanitizeForSql(query)})
    `;

  // Count total results
  const countQuery = `SELECT COUNT(*) AS total FROM (${baseSelect}) AS search_results`;
  const countRows = (await db.execute(sql.raw(countQuery))).rows as Array<{ total: string }>;
  const total = Number(countRows[0]?.total ?? 0);

  // Fetch paginated results ordered by rank (or name for nameOnly mode)
  const orderBy = nameOnly ? "name ASC" : "rank DESC, name ASC";
  const dataQuery = `
    SELECT * FROM (${baseSelect}) AS search_results
    ORDER BY ${orderBy}
    LIMIT ${pagination.pageSize}
    OFFSET ${pagination.offset}
  `;
  const rows = (await db.execute(sql.raw(dataQuery))).rows as unknown as SearchResult[];

  // Group results by type
  const grouped: Record<string, GroupedResults> = {};
  for (const row of rows) {
    const type = row.entityType ?? (row as unknown as Record<string, string>).entity_type;
    if (!grouped[type]) {
      grouped[type] = { type, count: 0, results: [] };
    }
    grouped[type].count++;
    grouped[type].results.push({
      id: row.id,
      name: row.name,
      description: row.description,
      entityType: type,
      lifecycle: row.lifecycle,
      health: row.health,
      rank: row.rank,
      headline: row.headline,
    });
  }

  const meta = buildPaginationMeta(total, pagination);

  return ok({
    query,
    results: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      entityType: row.entityType ?? (row as unknown as Record<string, string>).entity_type,
      lifecycle: row.lifecycle,
      health: row.health,
      rank: row.rank,
      headline: row.headline,
    })),
    grouped: Object.values(grouped),
    meta,
  });
});

// ── Utilities ───────────────────────────────────────────────────────────────

/**
 * Sanitize a user-provided string for inclusion in a SQL query.
 */
function sanitizeForSql(input: string): string {
  const escaped = input.replace(/'/g, "''");
  return `'${escaped}'`;
}
