/**
 * PLANV2 Phase 13 — Meta-model templates: export live config.
 *
 * GET /api/admin/templates/export — serialize the live meta-model config into a
 * downloadable MetaModelTemplate JSON file. Admin only.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { withErrorHandler } from "@/lib/api-response";
import { exportLiveConfig } from "@/lib/config-export";

export const GET = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const authz = requirePermission(auth.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const template = await exportLiveConfig();
  const body = JSON.stringify(template, null, 2);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="vantagemap-template.json"',
    },
  });
});
