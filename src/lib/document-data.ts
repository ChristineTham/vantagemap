/**
 * PLANV2 — Server-side document data access for pages (Server Components).
 *
 * Plain data functions (return rows, not Responses) used by the dynamic
 * document pages, distinct from the Response-returning handlers in
 * document-crud.ts.
 */

import { and, eq, asc, count } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { withRetry } from "@/lib/neon-retry";
import type { ResolvedTypeConfig } from "@/lib/document-registry";

/** Merge a document row's custom_fields into a flat object. */
export function flattenDocument(row: Record<string, unknown> | undefined | null) {
  if (!row) return null;
  const { customFields, ...rest } = row as Record<string, unknown> & {
    customFields?: Record<string, unknown> | null;
  };
  return { ...rest, ...(customFields ?? {}) };
}

/** All documents of a type (flattened), ordered by name. Best-effort (returns [] on error). */
export async function getDocumentsByType(typeConfig: ResolvedTypeConfig, limit = 500) {
  try {
    const rows = await withRetry(() =>
      db
        .select()
        .from(documents)
        .where(eq(documents.typeKey, typeConfig.typeKey))
        .orderBy(asc(documents.name))
        .limit(limit)
    );
    return rows.map((r) => flattenDocument(r)!);
  } catch {
    return [];
  }
}

/** A single document (flattened) by id, scoped to a type. */
export async function getDocumentById(typeConfig: ResolvedTypeConfig, id: string) {
  try {
    const [row] = await withRetry(() =>
      db
        .select()
        .from(documents)
        .where(and(eq(documents.id, id), eq(documents.typeKey, typeConfig.typeKey)))
        .limit(1)
    );
    return flattenDocument(row);
  } catch {
    return null;
  }
}

/** Count of documents of a type. */
export async function countDocumentsByType(typeConfig: ResolvedTypeConfig): Promise<number> {
  try {
    const [r] = await db
      .select({ value: count() })
      .from(documents)
      .where(eq(documents.typeKey, typeConfig.typeKey));
    return r?.value ?? 0;
  } catch {
    return 0;
  }
}
