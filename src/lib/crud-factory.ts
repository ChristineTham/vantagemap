/**
 * Phase 5 — Generic CRUD Route Factory
 *
 * Creates standard REST route handlers (GET list, GET by ID, POST, PATCH, DELETE)
 * for any Drizzle table with the common fact-sheet column pattern.
 *
 * Every entity endpoint in Phase 5 uses this factory to avoid duplication.
 * Custom logic (hierarchical queries, sub-resources) is layered on top.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { eq, and, count, type SQL, type Column } from "drizzle-orm";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";
import { type ZodSchema } from "zod";
import { after } from "next/server";
import { db } from "@/db";
import {
  ok,
  created,
  list,
  noContent,
  notFound,
  badRequest,
  withErrorHandler,
  parseBody,
} from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { writeAuditLog, computeDiff } from "@/lib/audit";
import type { FactSheetType } from "@/lib/audit-types";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { withRetry } from "@/lib/neon-retry";
import { notifySubscribers } from "@/lib/notifications";
import {
  parseListParams,
  buildOrderBy,
  buildWhereConditions,
  buildPaginationMeta,
} from "@/lib/query";

// ── Protected Fields ──────────────────────────────────────────────────────────

/**
 * Fields that must never be set via the generic create/update payload.
 *
 * `qualitySeal` is governed by the quality-seal state machine
 * (`/api/fact-sheets/:type/:id/quality-seal`) and its audit trail — accepting it
 * here would let any Member bypass the workflow. Timestamps and identity columns
 * are managed by the database / audit layer. These are stripped defensively even
 * if an entity's Zod schema happens to expose them.
 */
const PROTECTED_WRITE_FIELDS = ["qualitySeal", "createdAt", "updatedAt", "createdBy"] as const;

/** Remove server-controlled fields from a client-supplied payload. */
function stripProtectedFields<T extends Record<string, unknown>>(data: T): T {
  const clone = { ...data };
  for (const field of PROTECTED_WRITE_FIELDS) {
    delete clone[field];
  }
  return clone;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface CrudConfig {
  /** The Drizzle table object. */
  table: PgTableWithColumns<any>;
  /** Fact sheet type name for audit logging. */
  entityType: FactSheetType;
  /** Zod schema for creating a new entity. */
  createSchema: ZodSchema;
  /** Zod schema for updating an entity (all fields optional). */
  updateSchema: ZodSchema;
  /** Map of sortable/filterable field names to Drizzle columns. */
  columnMap: Record<string, Column>;
  /** Column to use as display name in audit logs (default: "name"). */
  displayNameColumn?: string;
  /** Additional WHERE conditions to always apply (e.g., workspace scoping). */
  baseConditions?: () => SQL[];
}

// ── Factory Functions ───────────────────────────────────────────────────────

/**
 * Create a GET handler for listing entities with pagination, sorting, and filtering.
 */
export function createListHandler(config: CrudConfig) {
  return withErrorHandler(async (request: Request) => {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const authz = requirePermission(auth.auth, "view");
    if (!authz.ok) return authz.response;

    const url = new URL(request.url);
    const query = parseListParams(url.searchParams);

    // Build WHERE conditions
    const filterConditions = buildWhereConditions(query.filters, config.columnMap);
    const baseConditions = config.baseConditions?.() ?? [];
    const allConditions = [...baseConditions, ...filterConditions];
    const whereClause = allConditions.length > 0 ? and(...allConditions) : undefined;

    // Build ORDER BY
    const orderBy = buildOrderBy(query.sort, config.columnMap);

    // Count total
    const [countResult] = await db.select({ value: count() }).from(config.table).where(whereClause);
    const total = countResult?.value ?? 0;

    // Fetch page
    let queryBuilder = db
      .select()
      .from(config.table)
      .where(whereClause)
      .limit(query.pagination.pageSize)
      .offset(query.pagination.offset);

    if (orderBy) {
      queryBuilder = queryBuilder.orderBy(orderBy) as typeof queryBuilder;
    }

    const rows = await queryBuilder;
    const meta = buildPaginationMeta(total, query.pagination);

    return list(rows, meta);
  });
}

/**
 * Create a GET handler for fetching a single entity by ID.
 */
export function createGetByIdHandler(config: CrudConfig) {
  return withErrorHandler(
    async (request: Request, context: { params: Promise<Record<string, string>> }) => {
      const auth = await requireAuth(request);
      if (!auth.ok) return auth.response;

      const authz = requirePermission(auth.auth, "view");
      if (!authz.ok) return authz.response;

      const { id } = await context.params;
      if (!id || !isValidUUID(id)) {
        return badRequest("Invalid ID format");
      }

      const [row] = await db
        .select()
        .from(config.table)
        .where(eq((config.table as any).id, id))
        .limit(1);

      if (!row) {
        return notFound(`${config.entityType} not found`);
      }

      return ok(row);
    }
  );
}

/**
 * Create a POST handler for creating a new entity.
 */
export function createCreateHandler(config: CrudConfig) {
  return withErrorHandler(async (request: Request) => {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const authz = requirePermission(auth.auth, "create");
    if (!authz.ok) return authz.response;

    const parsed = await parseBody(request, config.createSchema);
    if ("error" in parsed) return parsed.error;

    const values = stripProtectedFields(parsed.data as Record<string, unknown>);

    const [row] = await withRetry(() =>
      db
        .insert(config.table)
        .values(values as any)
        .returning()
    );

    if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
      const displayName =
        config.displayNameColumn && (row as any)[config.displayNameColumn]
          ? (row as any)[config.displayNameColumn]
          : ((row as any).name ?? undefined);

      after(async () => {
        await writeAuditLog({
          auth: auth.auth,
          action: "create",
          targetType: config.entityType,
          targetId: (row as any).id,
          targetDisplayName: displayName,
          request,
        });
      });
    }

    return created(row);
  });
}

/**
 * Create a PATCH handler for updating an entity.
 */
export function createUpdateHandler(config: CrudConfig) {
  return withErrorHandler(
    async (request: Request, context: { params: Promise<Record<string, string>> }) => {
      const auth = await requireAuth(request);
      if (!auth.ok) return auth.response;

      const authz = requirePermission(auth.auth, "edit");
      if (!authz.ok) return authz.response;

      const { id } = await context.params;
      if (!id || !isValidUUID(id)) {
        return badRequest("Invalid ID format");
      }

      // Fetch current record for diff
      const [existing] = await db
        .select()
        .from(config.table)
        .where(eq((config.table as any).id, id))
        .limit(1);

      if (!existing) {
        return notFound(`${config.entityType} not found`);
      }

      const parsed = await parseBody(request, config.updateSchema);
      if ("error" in parsed) return parsed.error;

      const values = stripProtectedFields(parsed.data as Record<string, unknown>);

      const [updated] = await withRetry(() =>
        db
          .update(config.table)
          .set(values as any)
          .where(eq((config.table as any).id, id))
          .returning()
      );

      if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
        const diff = computeDiff(existing as Record<string, unknown>, values);

        after(async () => {
          await writeAuditLog({
            auth: auth.auth,
            action: "update",
            targetType: config.entityType,
            targetId: id,
            targetDisplayName: (updated as any).name ?? undefined,
            diff: diff as Record<string, unknown> | undefined,
            request,
          });
        });
      }

      // Notify subscribers of the change (best-effort, non-blocking).
      after(async () => {
        await notifySubscribers({
          entityType: config.entityType,
          entityId: id,
          action: "updated",
          actorId: auth.auth.userId,
          displayName: (updated as any).name ?? undefined,
        });
      });

      return ok(updated);
    }
  );
}

/**
 * Create a DELETE handler for removing an entity.
 */
export function createDeleteHandler(config: CrudConfig) {
  return withErrorHandler(
    async (request: Request, context: { params: Promise<Record<string, string>> }) => {
      const auth = await requireAuth(request);
      if (!auth.ok) return auth.response;

      const authz = requirePermission(auth.auth, "delete");
      if (!authz.ok) return authz.response;

      const { id } = await context.params;
      if (!id || !isValidUUID(id)) {
        return badRequest("Invalid ID format");
      }

      const [existing] = await db
        .select()
        .from(config.table)
        .where(eq((config.table as any).id, id))
        .limit(1);

      if (!existing) {
        return notFound(`${config.entityType} not found`);
      }

      await withRetry(() => db.delete(config.table).where(eq((config.table as any).id, id)));

      if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
        after(async () => {
          await writeAuditLog({
            auth: auth.auth,
            action: "delete",
            targetType: config.entityType,
            targetId: id,
            targetDisplayName: (existing as any).name ?? undefined,
            request,
          });
        });
      }

      // Notify subscribers of the deletion (best-effort, non-blocking).
      after(async () => {
        await notifySubscribers({
          entityType: config.entityType,
          entityId: id,
          action: "deleted",
          actorId: auth.auth.userId,
          displayName: (existing as any).name ?? undefined,
        });
      });

      return noContent();
    }
  );
}

// ── Utilities ───────────────────────────────────────────────────────────────

/** UUID v4 format validation. */
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
