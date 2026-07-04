/**
 * PLANV3 — Document type/field configuration registry.
 *
 * DB-backed source of truth for which document types exist and which fields
 * each type has, with a short-lived in-memory cache. Everything that needs to
 * know the meta-model (API validation, forms, GraphQL, OpenAPI, sidebar) reads
 * from here rather than a hardcoded config.
 */

import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  documentTypeConfigs,
  documentFieldConfigs,
  documentPageComponents,
} from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import type { FieldConfigLike } from "@/lib/document-schema";

export type TypeConfigRow = InferSelectModel<typeof documentTypeConfigs>;
export type FieldConfigRow = InferSelectModel<typeof documentFieldConfigs>;
export type PageComponentRow = InferSelectModel<typeof documentPageComponents>;

export interface ResolvedTypeConfig extends TypeConfigRow {
  fields: FieldConfigRow[];
}

const CACHE_TTL_MS = 15_000;

interface CacheEntry {
  types: ResolvedTypeConfig[];
  expiresAt: number;
}

let cache: CacheEntry | null = null;

/** Clear the registry cache — call after any meta-model configuration change. */
export function invalidateRegistry(): void {
  cache = null;
}

async function loadAll(): Promise<ResolvedTypeConfig[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.types;

  const [types, fields] = await Promise.all([
    db.select().from(documentTypeConfigs).orderBy(asc(documentTypeConfigs.sortOrder)),
    db.select().from(documentFieldConfigs).orderBy(asc(documentFieldConfigs.sortOrder)),
  ]);

  const fieldsByType = new Map<string, FieldConfigRow[]>();
  for (const f of fields) {
    const list = fieldsByType.get(f.typeConfigId) ?? [];
    list.push(f);
    fieldsByType.set(f.typeConfigId, list);
  }

  const resolved: ResolvedTypeConfig[] = types.map((t) => ({
    ...t,
    fields: fieldsByType.get(t.id) ?? [],
  }));

  cache = { types: resolved, expiresAt: Date.now() + CACHE_TTL_MS };
  return resolved;
}

/** All active type configs (with fields), ordered by sortOrder. */
export async function listTypeConfigs(opts: { includeInactive?: boolean } = {}): Promise<
  ResolvedTypeConfig[]
> {
  const all = await loadAll();
  return opts.includeInactive ? all : all.filter((t) => t.isActive);
}

/** Resolve a type config by its URL slug. */
export async function getTypeConfigBySlug(slug: string): Promise<ResolvedTypeConfig | null> {
  const all = await loadAll();
  return all.find((t) => t.slug === slug) ?? null;
}

/** Resolve a type config by its machine type key. */
export async function getTypeConfigByKey(typeKey: string): Promise<ResolvedTypeConfig | null> {
  const all = await loadAll();
  return all.find((t) => t.typeKey === typeKey) ?? null;
}

/** Enabled field configs for a type, shaped for the dynamic schema builder. */
export function toFieldConfigLike(fields: FieldConfigRow[]): FieldConfigLike[] {
  return fields
    .filter((f) => f.enabled)
    .map((f) => ({
      fieldKey: f.fieldKey,
      fieldSource: f.fieldSource as "builtin" | "custom",
      dataType: f.dataType,
      required: f.required,
      enabled: f.enabled,
      options: f.options ?? undefined,
      validation: f.validation ?? undefined,
    }));
}

/** Page-component layout for a type, ordered. */
export async function getPageComponents(typeConfigId: string): Promise<PageComponentRow[]> {
  return db
    .select()
    .from(documentPageComponents)
    .where(eq(documentPageComponents.typeConfigId, typeConfigId))
    .orderBy(asc(documentPageComponents.sortOrder));
}
