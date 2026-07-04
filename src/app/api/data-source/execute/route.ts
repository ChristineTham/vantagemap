/**
 * PLANV3 — Execute a data-source configuration (reports/dashboards).
 * POST /api/data-source/execute
 */

import { z } from "zod";
import { withErrorHandler, ok, badRequest } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { validateDataSource, executeDataSource } from "@/lib/data-source-engine";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request: Request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  let config;
  try {
    config = validateDataSource(body);
  } catch (err) {
    if (err instanceof z.ZodError) return badRequest("Invalid data source config");
    throw err;
  }

  const result = await executeDataSource(config);
  return ok(result);
});
