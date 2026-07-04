/**
 * PLANV2 Phase 7 — Report builder data preview.
 *
 * POST /api/saved-reports/preview-data
 *   Body: { dataSource }
 *   Validates the data source then executes it, returning the first ~10 rows
 *   so the builder can show a live preview without persisting anything.
 */

import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { withErrorHandler, ok, badRequest, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { validateDataSource, executeDataSource } from "@/lib/data-source-engine";

const PREVIEW_LIMIT = 10;

const previewSchema = z.object({ dataSource: z.unknown() });

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // Previewing reads data — treat it as a view operation.
  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;

  const parsed = await parseBody(request, previewSchema);
  if ("error" in parsed) return parsed.error;

  let config;
  try {
    config = validateDataSource(parsed.data.dataSource);
  } catch (err) {
    if (err instanceof ZodError) return badRequest("Invalid data source configuration");
    throw err;
  }

  const result = await executeDataSource(config);

  const items = (result.items ?? []).slice(0, PREVIEW_LIMIT);
  const aggregates = result.aggregates ? result.aggregates.slice(0, PREVIEW_LIMIT) : undefined;

  return ok({
    items,
    ...(aggregates ? { aggregates } : {}),
    truncated: (result.items?.length ?? 0) > PREVIEW_LIMIT,
  });
});
