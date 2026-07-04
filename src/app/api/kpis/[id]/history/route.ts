/**
 * PLANV3 Phase 16 — KPI history (time series).
 *
 * GET  /api/kpis/[id]/history — history rows ordered by recorded_at asc.
 * POST /api/kpis/[id]/history — Body: { value }; appends a history row AND
 *   updates kpis.current_value to the new value.
 */

import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kpis, kpiHistory } from "@/db/schema";
import {
  ok,
  created,
  notFound,
  withErrorHandler,
  parseBody,
} from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

// `value` is stored as numeric; accept a number and serialise to string for the driver.
const appendSchema = z.object({
  value: z.number(),
});

export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const authz = requirePermission(auth.auth, "view");
    if (!authz.ok) return authz.response;

    const history = await db
      .select()
      .from(kpiHistory)
      .where(eq(kpiHistory.kpiId, id))
      .orderBy(asc(kpiHistory.recordedAt));

    return ok(history);
  }
);

export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const authz = requirePermission(auth.auth, "edit");
    if (!authz.ok) return authz.response;

    const body = await parseBody(request, appendSchema);
    if ("error" in body) return body.error;

    // Ensure the KPI exists before appending history.
    const [kpi] = await db.select().from(kpis).where(eq(kpis.id, id)).limit(1);
    if (!kpi) {
      return notFound(`KPI not found: ${id}`);
    }

    const value = String(body.data.value);

    // Append the history row.
    const [entry] = await db
      .insert(kpiHistory)
      .values({ kpiId: id, value })
      .returning();

    // Update the KPI's current value to match the latest reading.
    await db.update(kpis).set({ currentValue: value }).where(eq(kpis.id, id));

    return created(entry);
  }
);
