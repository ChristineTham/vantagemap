/**
 * Step 6.3 — Faceted Filter API (filter results)
 *
 * GET /api/facets/filter — Filter fact sheets across types with faceted criteria.
 *
 * PLANV2 cutover: filters over the unified `documents` table (by `type_key` and
 * the pooled facet columns) instead of the 12 legacy per-type tables.
 *
 * Query parameters:
 *   types          — comma-separated fact sheet types (required, at least one)
 *   lifecycle      — comma-separated lifecycle values to include
 *   health         — comma-separated health values to include
 *   qualitySeal    — comma-separated quality seal values to include
 *   tags           — comma-separated tag IDs (entities must have at least one of these tags)
 *   owner          — filter by owner (partial match)
 *   page / pageSize — pagination
 *   sortBy         — field to sort by (default: name)
 *   sortDirection  — asc or desc (default: asc)
 */

import { sql } from "drizzle-orm";
import { db } from "@/db";
// documents is the unified table this route filters (via raw SQL against its
// physical table name). Imported to anchor the PLANV2 schema contract.
import { documents } from "@/db/schema";
import { ok, badRequest, withErrorHandler } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { parsePagination, buildPaginationMeta } from "@/lib/query";

void documents;

// ── Types ───────────────────────────────────────────────────────────────────

interface FilteredResult {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  lifecycle: string | null;
  health: string | null;
  qualitySeal: string | null;
  owner: string | null;
  updatedAt: string;
}

// ── Configuration ───────────────────────────────────────────────────────────

/**
 * Valid entity type keys — these are the `type_key` values stored in the
 * unified `documents` table.
 */
const VALID_TYPES = new Set<string>([
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
]);

const VALID_SORT_FIELDS = new Set(["name", "updatedAt", "lifecycle", "health"]);

// ── GET Handler ─────────────────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);

  // Parse required types param
  const typesParam = url.searchParams.get("types");
  if (!typesParam) {
    return badRequest("Query parameter 'types' is required (comma-separated entity types)");
  }

  const requestedTypes = typesParam.split(",").map((t) => t.trim());
  const invalidTypes = requestedTypes.filter((t) => !VALID_TYPES.has(t));
  if (invalidTypes.length > 0) {
    return badRequest(`Invalid entity types: ${invalidTypes.join(", ")}`);
  }

  // Parse optional filters
  const lifecycleFilter =
    url.searchParams
      .get("lifecycle")
      ?.split(",")
      .map((v) => v.trim()) ?? [];
  const healthFilter =
    url.searchParams
      .get("health")
      ?.split(",")
      .map((v) => v.trim()) ?? [];
  const qualitySealFilter =
    url.searchParams
      .get("qualitySeal")
      ?.split(",")
      .map((v) => v.trim()) ?? [];
  const tagFilter =
    url.searchParams
      .get("tags")
      ?.split(",")
      .map((v) => v.trim()) ?? [];
  const ownerFilter = url.searchParams.get("owner")?.trim() ?? "";

  // Parse sorting
  const sortBy = url.searchParams.get("sortBy") ?? "name";
  const sortDirection = url.searchParams.get("sortDirection") === "desc" ? "DESC" : "ASC";

  if (!VALID_SORT_FIELDS.has(sortBy)) {
    return badRequest(`Invalid sortBy field. Allowed: ${[...VALID_SORT_FIELDS].join(", ")}`);
  }

  const pagination = parsePagination(url.searchParams);

  // Build WHERE conditions against the unified documents table
  const conditions: string[] = [];

  const escapeList = (vals: string[]) =>
    vals.map((v) => `'${v.replace(/'/g, "''")}'`).join(",");

  // type_key filter (required)
  conditions.push(`type_key IN (${escapeList(requestedTypes)})`);

  // Lifecycle filter
  if (lifecycleFilter.length > 0) {
    conditions.push(`lifecycle IN (${escapeList(lifecycleFilter)})`);
  }

  // Health filter
  if (healthFilter.length > 0) {
    conditions.push(`health IN (${escapeList(healthFilter)})`);
  }

  // Quality seal filter
  if (qualitySealFilter.length > 0) {
    conditions.push(`quality_seal IN (${escapeList(qualitySealFilter)})`);
  }

  // Owner filter (partial match)
  if (ownerFilter) {
    conditions.push(`owner ILIKE '%${ownerFilter.replace(/'/g, "''")}%'`);
  }

  // Tag filter — entity must have at least one of the specified tags.
  // tag_assignments.fact_sheet_type stores the type_key; fact_sheet_id the document id.
  if (tagFilter.length > 0) {
    conditions.push(
      `id IN (SELECT fact_sheet_id FROM tag_assignments WHERE fact_sheet_type IN (${escapeList(
        requestedTypes
      )}) AND tag_id IN (${escapeList(tagFilter)}))`
    );
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const baseSelect = `
    SELECT
      id,
      name,
      description,
      type_key AS entity_type,
      lifecycle::text AS lifecycle,
      health::text AS health,
      quality_seal::text AS quality_seal,
      owner,
      updated_at::text AS updated_at
    FROM documents
    ${whereClause}
  `;

  // Count total
  const countQuery = `SELECT COUNT(*)::int AS total FROM (${baseSelect}) AS filtered`;
  const countResult = (await db.execute(sql.raw(countQuery))).rows as Array<{ total: number }>;
  const total = Number(countResult[0]?.total ?? 0);

  // Map sort field for the outer query
  const outerSortCol =
    sortBy === "updatedAt" ? "updated_at" : sortBy === "qualitySeal" ? "quality_seal" : sortBy;

  // Fetch results
  const dataQuery = `
    SELECT * FROM (${baseSelect}) AS filtered
    ORDER BY ${outerSortCol} ${sortDirection} NULLS LAST, name ASC
    LIMIT ${pagination.pageSize}
    OFFSET ${pagination.offset}
  `;
  const rows = (await db.execute(sql.raw(dataQuery))).rows as unknown as FilteredResult[];

  const meta = buildPaginationMeta(total, pagination);

  return ok({
    results: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      entityType: row.entityType ?? (row as unknown as Record<string, string>).entity_type,
      lifecycle: row.lifecycle,
      health: row.health,
      qualitySeal: row.qualitySeal ?? (row as unknown as Record<string, string>).quality_seal,
      owner: row.owner,
      updatedAt: row.updatedAt ?? (row as unknown as Record<string, string>).updated_at,
    })),
    meta,
  });
});
