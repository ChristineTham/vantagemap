/**
 * PLANV3 Phase 15 — Architecture Decision status transition.
 *
 * POST /api/documents/decisions/[id]/transition
 *   Body: { to, reason? }
 *
 * A Decision is a document with type_key = "Decision"; its status lives in the
 * pooled `documents.decision_status` column. This endpoint validates the
 * requested transition against the decision-workflow state machine (role-aware),
 * updates the status, and records a row in `decision_transitions`.
 */

import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { documents, decisionTransitions } from "@/db/schema";
import {
  ok,
  badRequest,
  forbidden,
  notFound,
  withErrorHandler,
  parseBody,
} from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  type DecisionState,
  canTransitionDecision,
  getValidDecisionTransitions,
  isDecisionState,
} from "@/lib/decision-workflow";

const DEFAULT_STATE: DecisionState = "Proposed";

const transitionSchema = z.object({
  to: z.string().min(1),
  reason: z.string().max(1000).optional(),
});

export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const authz = requirePermission(auth.auth, "edit");
    if (!authz.ok) return authz.response;

    const body = await parseBody(request, transitionSchema);
    if ("error" in body) return body.error;

    const { to, reason } = body.data;

    // Validate the requested target is a recognised decision state.
    if (!isDecisionState(to)) {
      return badRequest(`Invalid decision state: '${to}'`);
    }

    // Load the decision document (must be type_key = "Decision").
    const [decision] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.typeKey, "Decision")))
      .limit(1);

    if (!decision) {
      return notFound(`Decision not found: ${id}`);
    }

    const current: DecisionState =
      decision.decisionStatus && isDecisionState(decision.decisionStatus)
        ? decision.decisionStatus
        : DEFAULT_STATE;

    // Role-aware transition validation.
    if (!canTransitionDecision(current, to, auth.auth.role)) {
      // Is the target reachable at all from the current state (any role)?
      // "Admin" is the most-privileged role, so it sees the full set of edges.
      const reachable = getValidDecisionTransitions(current, "Admin").some((t) => t.to === to);
      if (!reachable) {
        // No such edge exists → invalid target for this state.
        return badRequest(`Cannot transition from '${current}' to '${to}'`);
      }
      // Edge exists but this role may not perform it.
      return forbidden(
        `Transition from '${current}' to '${to}' is not allowed for role '${auth.auth.role}'`
      );
    }

    // Update the decision status.
    const [updated] = await db
      .update(documents)
      .set({ decisionStatus: to })
      .where(eq(documents.id, id))
      .returning();

    // Record the transition.
    await db.insert(decisionTransitions).values({
      decisionId: id,
      fromState: current,
      toState: to,
      actorId: auth.auth.userId,
      reason: reason ?? null,
    });

    return ok(updated);
  }
);
