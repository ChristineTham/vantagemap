/**
 * Phase 13.7 — Adoption Metrics API
 *
 * GET /api/reports/adoption
 *
 * Returns adoption metrics from the audit log: mutations per user, active
 * users per day over the last 30 days, most-edited entity types, and a
 * create/update/delete breakdown.
 */

import { NextRequest } from "next/server";
import { withErrorHandler, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getAdoptionMetrics } from "@/lib/reports-extended";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;

  const authz = requirePermission(authResult.auth, "view");
  if (!authz.ok) return authz.response;

  const report = await getAdoptionMetrics();

  return ok({ data: report });
});
