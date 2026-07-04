/**
 * Phase 13.5 — Roadmap Impact Analysis API
 *
 * GET /api/reports/roadmap-impact
 *
 * Returns, per initiative, the number of applications and capabilities it
 * touches (via the relationships table), an initiative status distribution,
 * a start-date timeline, and capability gap analysis.
 */

import { NextRequest } from "next/server";
import { withErrorHandler, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getRoadmapImpact } from "@/lib/reports-extended";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;

  const authz = requirePermission(authResult.auth, "view");
  if (!authz.ok) return authz.response;

  const report = await getRoadmapImpact();

  return ok({ data: report });
});
