/**
 * PLAN 6.3 / 9.6 — Saved Searches API (individual)
 *
 * GET    /api/saved-searches/:id — fetch one saved search
 * PATCH  /api/saved-searches/:id — rename / update a saved search
 * DELETE /api/saved-searches/:id — delete a saved search
 *
 * Every query is scoped to the authenticated user (auth.auth.userId). If the
 * row does not exist OR is not owned by the caller, a 404 is returned so that
 * ownership is never leaked.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { savedSearches } from "@/db/schema/saved-searches";
import { ok, noContent, notFound, withErrorHandler, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

const updateSavedSearchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  query: z.string().max(2000).nullish(),
  entityTypes: z.array(z.string().max(100)).nullish(),
  filters: z.record(z.string(), z.string()).nullish(),
});

export const GET = withErrorHandler(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const [row] = await db
      .select()
      .from(savedSearches)
      .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, auth.auth.userId)))
      .limit(1);

    if (!row) return notFound("Saved search not found");
    return ok(row);
  }
);

export const PATCH = withErrorHandler(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const body = await parseBody(request, updateSavedSearchSchema);
    if ("error" in body) return body.error;

    const updates: Record<string, unknown> = {};
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.query !== undefined) updates.query = body.data.query ?? null;
    if (body.data.entityTypes !== undefined) updates.entityTypes = body.data.entityTypes ?? null;
    if (body.data.filters !== undefined) updates.filters = body.data.filters ?? null;

    const [updated] = await db
      .update(savedSearches)
      .set(updates)
      .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, auth.auth.userId)))
      .returning();

    if (!updated) return notFound("Saved search not found");
    return ok(updated);
  }
);

export const DELETE = withErrorHandler(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const deleted = await db
      .delete(savedSearches)
      .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, auth.auth.userId)))
      .returning();

    if (deleted.length === 0) return notFound("Saved search not found");
    return noContent();
  }
);
