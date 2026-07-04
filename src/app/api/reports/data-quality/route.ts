/**
 * Phase 13.6 — Data Quality Metrics API
 *
 * GET /api/reports/data-quality
 *
 * Returns completeness scores per fact sheet type (% with description, owner,
 * and Approved quality seal), missing-field counts, and an overall score.
 */

import { NextRequest } from "next/server";
import { withErrorHandler, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getDataQualityMetrics } from "@/lib/reports-extended";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;

  const authz = requirePermission(authResult.auth, "view");
  if (!authz.ok) return authz.response;

  const report = await getDataQualityMetrics();

  return ok({ data: report });
});
