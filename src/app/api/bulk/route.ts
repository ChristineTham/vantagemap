/**
 * Step 6.4 — Bulk Operations API (PLANV2: unified `documents` table)
 *
 * POST /api/bulk/update — Bulk update tags, lifecycle, fields for selected fact sheets.
 * POST /api/bulk/delete — Bulk delete selected fact sheets.
 * POST /api/bulk/upsert — Idempotent upsert for import workflows.
 *
 * All entities live in the unified `documents` table, discriminated by
 * `type_key`. The API's `type` field is the document type key (e.g.
 * "Application"). All operations audit log each affected entity individually.
 * Max 100 entities per request (guard against abuse).
 */

import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { tagAssignments } from "@/db/schema";
import { ok, withErrorHandler, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { isFeatureEnabled } from "@/lib/feature-flags";

// ── Types & Configuration ───────────────────────────────────────────────────

// The document type keys that may be targeted by bulk operations. The API's
// `type` field carries one of these keys; every row lives in the unified
// `documents` table discriminated by `type_key`. Validated statically so the
// request never needs a DB round-trip just to reject an unknown type.
const VALID_TYPE_KEYS = [
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

// Types that do not carry lifecycle/health columns on create (mirrors the
// legacy per-table behaviour, now expressed against the pooled columns).
const TYPES_WITHOUT_LIFECYCLE = new Set<string>(["TechCategory", "Provider"]);

// ── Schemas ─────────────────────────────────────────────────────────────────

const entityRefSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(VALID_TYPE_KEYS as unknown as [string, ...string[]]),
});

const bulkUpdateSchema = z.object({
  entities: z.array(entityRefSchema).min(1).max(100),
  fields: z
    .object({
      lifecycle: z.enum(["Plan", "Phase In", "Active", "Phase Out", "End of Life"]).optional(),
      health: z.enum(["Excellent", "Good", "Fair", "Poor", "Critical"]).optional(),
      qualitySeal: z.enum(["Draft", "Check Needed", "Approved", "Rejected"]).optional(),
      owner: z.string().max(255).optional(),
    })
    .optional(),
  addTags: z.array(z.string().uuid()).max(20).optional(),
  removeTags: z.array(z.string().uuid()).max(20).optional(),
});

const bulkDeleteSchema = z.object({
  entities: z.array(entityRefSchema).min(1).max(100),
});

const upsertItemSchema = z.object({
  type: z.enum(VALID_TYPE_KEYS as unknown as [string, ...string[]]),
  externalId: z.string().max(255).optional(),
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
  lifecycle: z.enum(["Plan", "Phase In", "Active", "Phase Out", "End of Life"]).optional(),
  health: z.enum(["Excellent", "Good", "Fair", "Poor", "Critical"]).optional(),
  owner: z.string().max(255).nullish(),
});

const bulkUpsertSchema = z.object({
  items: z.array(upsertItemSchema).min(1).max(100),
});

// ── POST /api/bulk/update ───────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "delete") {
    return handleBulkDelete(request, auth.auth);
  }
  if (action === "upsert") {
    return handleBulkUpsert(request, auth.auth);
  }

  // Default: bulk update
  return handleBulkUpdate(request, auth.auth);
});

// ── Bulk Update ─────────────────────────────────────────────────────────────

async function handleBulkUpdate(
  request: Request,
  auth: { userId: string; email: string; name: string; role: string; workspaceId: string }
) {
  const authz = requirePermission(auth as Parameters<typeof requirePermission>[0], "edit");
  if (!authz.ok) return authz.response;

  const parsed = await parseBody(request, bulkUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const { entities, fields, addTags, removeTags } = parsed.data;

  const results: { id: string; type: string; status: "updated" | "not_found" }[] = [];

  // Group entities by type for efficient batching
  const byType: Record<string, string[]> = {};
  for (const entity of entities) {
    if (!byType[entity.type]) byType[entity.type] = [];
    byType[entity.type].push(entity.id);
  }

  // Bulk field updates (per type)
  if (fields && Object.keys(fields).length > 0) {
    for (const [entityType, ids] of Object.entries(byType)) {
      // Build SET clause
      const setClauses: string[] = [];
      if (fields.lifecycle) {
        setClauses.push(`lifecycle = '${fields.lifecycle.replace(/'/g, "''")}'`);
      }
      if (fields.health) {
        setClauses.push(`health = '${fields.health.replace(/'/g, "''")}'`);
      }
      if (fields.qualitySeal) {
        setClauses.push(`quality_seal = '${fields.qualitySeal.replace(/'/g, "''")}'`);
      }
      if (fields.owner !== undefined) {
        setClauses.push(`owner = '${fields.owner.replace(/'/g, "''")}'`);
      }
      setClauses.push(`updated_at = NOW()`);

      if (setClauses.length > 1) {
        const idList = ids.map((id) => `'${id}'`).join(",");
        const typeKey = entityType.replace(/'/g, "''");
        const query = `UPDATE documents SET ${setClauses.join(", ")} WHERE type_key = '${typeKey}' AND id IN (${idList}) RETURNING id`;
        const updated = (await db.execute(sql.raw(query))).rows as Array<{ id: string }>;

        for (const row of updated) {
          results.push({ id: row.id, type: entityType, status: "updated" });
        }

        // Audit each update
        if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
          for (const row of updated) {
            await writeAuditLog({
              auth: auth as Parameters<typeof writeAuditLog>[0]["auth"],
              action: "update",
              targetType: entityType as Parameters<typeof writeAuditLog>[0]["targetType"],
              targetId: row.id,
              targetDisplayName: `Bulk update: ${Object.keys(fields).join(", ")}`,
              diff: fields as Record<string, unknown>,
              request,
            });
          }
        }
      }
    }
  }

  // Add tags — single multi-row insert
  if (addTags && addTags.length > 0) {
    const values = entities.flatMap((entity) =>
      addTags.map((tagId) => ({
        tagId,
        factSheetType: entity.type as never,
        factSheetId: entity.id,
      }))
    );
    try {
      await db.insert(tagAssignments).values(values).onConflictDoNothing();
    } catch {
      // Ignore constraint violations (e.g., invalid tag IDs)
    }
  }

  // Remove tags — batch per entity using parameterized queries
  if (removeTags && removeTags.length > 0) {
    await Promise.all(
      entities.map((entity) =>
        db.execute(
          sql`DELETE FROM tag_assignments WHERE tag_id = ANY(${removeTags}) AND fact_sheet_type = ${entity.type} AND fact_sheet_id = ${entity.id}`
        )
      )
    );
  }

  return ok({
    updated: results.length,
    results,
    tagsAdded: addTags?.length ?? 0,
    tagsRemoved: removeTags?.length ?? 0,
  });
}

// ── Bulk Delete ─────────────────────────────────────────────────────────────

async function handleBulkDelete(
  request: Request,
  auth: { userId: string; email: string; name: string; role: string; workspaceId: string }
) {
  const authz = requirePermission(auth as Parameters<typeof requirePermission>[0], "delete");
  if (!authz.ok) return authz.response;

  const parsed = await parseBody(request, bulkDeleteSchema);
  if ("error" in parsed) return parsed.error;

  const { entities } = parsed.data;
  const results: { id: string; type: string; status: "deleted" | "not_found" }[] = [];

  // Group by type
  const byType: Record<string, string[]> = {};
  for (const entity of entities) {
    if (!byType[entity.type]) byType[entity.type] = [];
    byType[entity.type].push(entity.id);
  }

  for (const [entityType, ids] of Object.entries(byType)) {
    const idList = ids.map((id) => `'${id}'`).join(",");
    const typeKey = entityType.replace(/'/g, "''");

    // First, clean up related data (tag assignments, subscriptions, relationships)
    await db.execute(
      sql.raw(
        `DELETE FROM tag_assignments WHERE fact_sheet_type = '${typeKey}' AND fact_sheet_id IN (${idList})`
      )
    );
    await db.execute(
      sql.raw(
        `DELETE FROM subscriptions WHERE fact_sheet_type = '${typeKey}' AND fact_sheet_id IN (${idList})`
      )
    );
    await db.execute(
      sql.raw(
        `DELETE FROM relationships WHERE (source_type = '${typeKey}' AND source_id IN (${idList})) OR (target_type = '${typeKey}' AND target_id IN (${idList}))`
      )
    );

    // Delete the entities (scoped to this type_key within the unified table)
    const deleted = (
      await db.execute(
        sql.raw(
          `DELETE FROM documents WHERE type_key = '${typeKey}' AND id IN (${idList}) RETURNING id`
        )
      )
    ).rows as Array<{ id: string }>;

    for (const row of deleted) {
      results.push({ id: row.id, type: entityType, status: "deleted" });
    }

    // Audit each deletion
    if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
      for (const row of deleted) {
        await writeAuditLog({
          auth: auth as Parameters<typeof writeAuditLog>[0]["auth"],
          action: "delete",
          targetType: entityType as Parameters<typeof writeAuditLog>[0]["targetType"],
          targetId: row.id,
          targetDisplayName: `Bulk delete`,
          request,
        });
      }
    }
  }

  return ok({
    deleted: results.length,
    results,
  });
}

// ── Bulk Upsert (import workflow) ───────────────────────────────────────────

async function handleBulkUpsert(
  request: Request,
  auth: { userId: string; email: string; name: string; role: string; workspaceId: string }
) {
  const authz = requirePermission(auth as Parameters<typeof requirePermission>[0], "create");
  if (!authz.ok) return authz.response;

  const parsed = await parseBody(request, bulkUpsertSchema);
  if ("error" in parsed) return parsed.error;

  const { items } = parsed.data;
  const results: { name: string; type: string; action: "created" | "updated"; id: string }[] = [];

  for (const item of items) {
    const typeKey = item.type.replace(/'/g, "''");
    const name = item.name.replace(/'/g, "''");
    const description = item.description ? item.description.replace(/'/g, "''") : null;
    const lifecycle = item.lifecycle ?? "Active";
    const health = item.health ?? "Good";
    const owner = item.owner ? item.owner.replace(/'/g, "''") : null;

    // Try to find existing by name + type (idempotent upsert)
    const existing = (
      await db.execute(
        sql.raw(
          `SELECT id FROM documents WHERE type_key = '${typeKey}' AND name = '${name}' LIMIT 1`
        )
      )
    ).rows as Array<{ id: string }>;

    if (existing.length > 0) {
      // Update existing
      const setClauses = [`updated_at = NOW()`];
      if (description !== null) setClauses.push(`description = '${description}'`);
      if (item.lifecycle) setClauses.push(`lifecycle = '${lifecycle}'`);
      if (item.health) setClauses.push(`health = '${health}'`);
      if (owner !== null) setClauses.push(`owner = '${owner}'`);

      await db.execute(
        sql.raw(
          `UPDATE documents SET ${setClauses.join(", ")} WHERE id = '${existing[0].id}'`
        )
      );

      results.push({ name: item.name, type: item.type, action: "updated", id: existing[0].id });

      if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
        await writeAuditLog({
          auth: auth as Parameters<typeof writeAuditLog>[0]["auth"],
          action: "update",
          targetType: item.type as Parameters<typeof writeAuditLog>[0]["targetType"],
          targetId: existing[0].id,
          targetDisplayName: item.name,
          request,
        });
      }
    } else {
      // Create new — type_key is mandatory on the unified table
      const cols = ["type_key", "name"];
      const vals = [`'${typeKey}'`, `'${name}'`];

      if (description !== null) {
        cols.push("description");
        vals.push(`'${description}'`);
      }

      // Only add lifecycle/health for types that have them
      if (!TYPES_WITHOUT_LIFECYCLE.has(item.type)) {
        cols.push("lifecycle");
        vals.push(`'${lifecycle}'`);
        cols.push("health");
        vals.push(`'${health}'`);
      }

      if (owner !== null) {
        cols.push("owner");
        vals.push(`'${owner}'`);
      }

      const insertResult = (
        await db.execute(
          sql.raw(
            `INSERT INTO documents (${cols.join(", ")}) VALUES (${vals.join(", ")}) RETURNING id`
          )
        )
      ).rows as Array<{ id: string }>;

      const newId = insertResult[0]?.id ?? "unknown";
      results.push({ name: item.name, type: item.type, action: "created", id: newId });

      if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
        await writeAuditLog({
          auth: auth as Parameters<typeof writeAuditLog>[0]["auth"],
          action: "create",
          targetType: item.type as Parameters<typeof writeAuditLog>[0]["targetType"],
          targetId: newId,
          targetDisplayName: item.name,
          request,
        });
      }
    }
  }

  return ok({
    processed: results.length,
    created: results.filter((r) => r.action === "created").length,
    updated: results.filter((r) => r.action === "updated").length,
    results,
  });
}
