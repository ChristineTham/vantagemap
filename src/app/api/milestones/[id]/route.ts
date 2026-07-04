/**
 * PLANV3 — Milestone item endpoint.
 * PATCH/DELETE /api/milestones/[id]
 */

import { withErrorHandler } from "@/lib/api-response";
import { updateMilestone, deleteMilestone } from "@/lib/milestone-crud";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandler(async (request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return updateMilestone(request, id);
});

export const DELETE = withErrorHandler(async (request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return deleteMilestone(request, id);
});
