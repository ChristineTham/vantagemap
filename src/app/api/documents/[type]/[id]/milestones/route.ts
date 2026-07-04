/**
 * PLANV2 — Milestones for a document.
 * GET/POST /api/documents/[type]/[id]/milestones
 */

import { withErrorHandler } from "@/lib/api-response";
import { listMilestones, createMilestone } from "@/lib/milestone-crud";

type Ctx = { params: Promise<{ type: string; id: string }> };

export const GET = withErrorHandler(async (request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return listMilestones(request, id);
});

export const POST = withErrorHandler(async (request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return createMilestone(request, id);
});
