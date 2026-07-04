/**
 * PLAN 6.3 / 9.6 — Saved Searches API (collection)
 *
 * GET  /api/saved-searches — list the current user's saved searches
 * POST /api/saved-searches — create a saved search for the current user
 *
 * All queries are scoped to the authenticated user (auth.auth.userId), so a
 * user may only see and create their own saved searches. This is per-user data,
 * not RBAC-role-gated — any valid session is sufficient.
 */

import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { savedSearches } from "@/db/schema/saved-searches";
import { ok, created, withErrorHandler, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

const createSavedSearchSchema = z.object({
  name: z.string().min(1).max(255),
  query: z.string().max(2000).nullish(),
  entityTypes: z.array(z.string().max(100)).nullish(),
  filters: z.record(z.string(), z.string()).nullish(),
});

export const GET = withErrorHandler(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const rows = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, auth.auth.userId))
    .orderBy(desc(savedSearches.updatedAt));

  return ok(rows);
});

export const POST = withErrorHandler(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, createSavedSearchSchema);
  if ("error" in body) return body.error;

  const [row] = await db
    .insert(savedSearches)
    .values({
      userId: auth.auth.userId,
      name: body.data.name,
      query: body.data.query ?? null,
      entityTypes: body.data.entityTypes ?? null,
      filters: body.data.filters ?? null,
    })
    .returning();

  return created(row);
});
