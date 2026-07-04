/**
 * PLANV2 — Unified document CRUD handlers.
 *
 * Serves every document type from the single `documents` table, validating
 * writes against the type's runtime field configuration (registry) and routing
 * values into built-in columns vs. the custom_fields JSONB.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { after } from "next/server";
import { eq, and, count, type Column, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import {
  ok,
  created,
  list,
  noContent,
  notFound,
  badRequest,
  parseBody,
} from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { writeAuditLog, computeDiff } from "@/lib/audit";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { withRetry } from "@/lib/neon-retry";
import { notifySubscribers } from "@/lib/notifications";
import {
  parseListParams,
  buildOrderBy,
  buildWhereConditions,
  buildPaginationMeta,
} from "@/lib/query";
import { buildDocumentSchema, splitDocumentData } from "@/lib/document-schema";
import { toFieldConfigLike, type ResolvedTypeConfig } from "@/lib/document-registry";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Build a filter/sort column map from a type's filterable built-in fields. */
function buildColumnMap(typeConfig: ResolvedTypeConfig): Record<string, Column> {
  const map: Record<string, Column> = {
    name: documents.name,
    lifecycle: documents.lifecycle,
    health: documents.health,
    qualitySeal: documents.qualitySeal,
    owner: documents.owner,
    createdAt: documents.createdAt,
    updatedAt: documents.updatedAt,
  };
  for (const f of typeConfig.fields) {
    if (f.fieldSource === "builtin" && f.filterable && (documents as any)[f.fieldKey]) {
      map[f.fieldKey] = (documents as any)[f.fieldKey] as Column;
    }
  }
  return map;
}

/** Merge a document row's custom_fields into a flat DTO. */
function toDto(row: Record<string, unknown>): Record<string, unknown> {
  const { customFields, ...rest } = row as any;
  return { ...rest, ...(customFields ?? {}) };
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listDocuments(request: Request, typeConfig: ResolvedTypeConfig) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);
  const query = parseListParams(url.searchParams);
  const columnMap = buildColumnMap(typeConfig);

  const typeCond: SQL = eq(documents.typeKey, typeConfig.typeKey);
  const filterConditions = buildWhereConditions(query.filters, columnMap);
  const whereClause = and(typeCond, ...filterConditions);

  const orderBy = buildOrderBy(query.sort, columnMap);

  const [countResult] = await withRetry(() =>
    db.select({ value: count() }).from(documents).where(whereClause)
  );
  const total = countResult?.value ?? 0;

  let qb = db
    .select()
    .from(documents)
    .where(whereClause)
    .limit(query.pagination.pageSize)
    .offset(query.pagination.offset);
  if (orderBy) qb = qb.orderBy(orderBy) as typeof qb;

  const rows = await withRetry(() => qb);
  return list(rows.map(toDto), buildPaginationMeta(total, query.pagination));
}

// ── Create ──────────────────────────────────────────────────────────────────

export async function createDocument(request: Request, typeConfig: ResolvedTypeConfig) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "create");
  if (!authz.ok) return authz.response;

  const fields = toFieldConfigLike(typeConfig.fields);
  const schema = buildDocumentSchema(fields);
  const parsed = await parseBody(request, schema);
  if ("error" in parsed) return parsed.error;

  const { columns, customFields } = splitDocumentData(
    parsed.data as Record<string, unknown>,
    fields
  );

  const [row] = await withRetry(() =>
    db
      .insert(documents)
      .values({
        typeKey: typeConfig.typeKey,
        ...(columns as any),
        customFields: Object.keys(customFields).length ? customFields : null,
      })
      .returning()
  );

  if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
    after(async () => {
      await writeAuditLog({
        auth: auth.auth,
        action: "create",
        targetType: typeConfig.typeKey as any,
        targetId: (row as any).id,
        targetDisplayName: (row as any).name,
        request,
      });
    });
  }

  return created(toDto(row));
}

// ── Get by id ─────────────────────────────────────────────────────────────────

export async function getDocument(request: Request, typeConfig: ResolvedTypeConfig, id: string) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;
  if (!UUID_RE.test(id)) return badRequest("Invalid ID format");

  const [row] = await withRetry(() =>
    db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.typeKey, typeConfig.typeKey)))
      .limit(1)
  );
  if (!row) return notFound(`${typeConfig.displayName} not found`);
  return ok(toDto(row));
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateDocument(
  request: Request,
  typeConfig: ResolvedTypeConfig,
  id: string
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "edit");
  if (!authz.ok) return authz.response;
  if (!UUID_RE.test(id)) return badRequest("Invalid ID format");

  const [existing] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.typeKey, typeConfig.typeKey)))
    .limit(1);
  if (!existing) return notFound(`${typeConfig.displayName} not found`);

  const fields = toFieldConfigLike(typeConfig.fields);
  const schema = buildDocumentSchema(fields, { partial: true });
  const parsed = await parseBody(request, schema);
  if ("error" in parsed) return parsed.error;

  const { columns, customFields } = splitDocumentData(
    parsed.data as Record<string, unknown>,
    fields
  );

  const mergedCustom = {
    ...((existing as any).customFields ?? {}),
    ...customFields,
  };

  const [updated] = await withRetry(() =>
    db
      .update(documents)
      .set({
        ...(columns as any),
        customFields: Object.keys(mergedCustom).length ? mergedCustom : null,
      })
      .where(eq(documents.id, id))
      .returning()
  );

  if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
    const diff = computeDiff(existing as Record<string, unknown>, columns);
    after(async () => {
      await writeAuditLog({
        auth: auth.auth,
        action: "update",
        targetType: typeConfig.typeKey as any,
        targetId: id,
        targetDisplayName: (updated as any).name,
        diff: diff as Record<string, unknown> | undefined,
        request,
      });
    });
  }

  after(async () => {
    await notifySubscribers({
      entityType: typeConfig.typeKey,
      entityId: id,
      action: "updated",
      actorId: auth.auth.userId,
      displayName: (updated as any).name,
    });
  });

  return ok(toDto(updated));
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteDocument(
  request: Request,
  typeConfig: ResolvedTypeConfig,
  id: string
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "delete");
  if (!authz.ok) return authz.response;
  if (!UUID_RE.test(id)) return badRequest("Invalid ID format");

  const [existing] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.typeKey, typeConfig.typeKey)))
    .limit(1);
  if (!existing) return notFound(`${typeConfig.displayName} not found`);

  await withRetry(() => db.delete(documents).where(eq(documents.id, id)));

  if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
    after(async () => {
      await writeAuditLog({
        auth: auth.auth,
        action: "delete",
        targetType: typeConfig.typeKey as any,
        targetId: id,
        targetDisplayName: (existing as any).name,
        request,
      });
    });
  }

  return noContent();
}
