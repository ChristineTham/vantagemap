/**
 * PLANV2 — Architecture Decision state machine.
 *
 * Governs the status lifecycle of a Decision document, distinct from (and
 * orthogonal to) the Quality Seal. Same shape as quality-seal.ts.
 *
 *   Proposed → Under Review → { Accepted | Rejected }
 *   Under Review → Proposed (revise)
 *   Accepted → { Superseded | Deprecated }
 *   Rejected → Proposed (reopen)
 */

import type { StandardRole } from "@/lib/auth";

export type DecisionState =
  | "Proposed"
  | "Under Review"
  | "Accepted"
  | "Rejected"
  | "Superseded"
  | "Deprecated";

interface DecisionTransition {
  from: DecisionState;
  to: DecisionState;
  allowedRoles: StandardRole[];
  label: string;
}

export const DECISION_TRANSITIONS: DecisionTransition[] = [
  { from: "Proposed", to: "Under Review", allowedRoles: ["Member", "Admin"], label: "Submit for Review" },
  { from: "Under Review", to: "Accepted", allowedRoles: ["Admin"], label: "Accept" },
  { from: "Under Review", to: "Rejected", allowedRoles: ["Admin"], label: "Reject" },
  { from: "Under Review", to: "Proposed", allowedRoles: ["Member", "Admin"], label: "Revise" },
  { from: "Rejected", to: "Proposed", allowedRoles: ["Member", "Admin"], label: "Reopen" },
  { from: "Accepted", to: "Superseded", allowedRoles: ["Admin"], label: "Mark Superseded" },
  { from: "Accepted", to: "Deprecated", allowedRoles: ["Admin"], label: "Deprecate" },
];

export const DECISION_STATES: DecisionState[] = [
  "Proposed",
  "Under Review",
  "Accepted",
  "Rejected",
  "Superseded",
  "Deprecated",
];

/** Valid transitions from a state for a given role. */
export function getValidDecisionTransitions(
  from: DecisionState,
  role: StandardRole
): DecisionTransition[] {
  return DECISION_TRANSITIONS.filter((t) => t.from === from && t.allowedRoles.includes(role));
}

/** Whether a role may perform a specific transition. */
export function canTransitionDecision(
  from: DecisionState,
  to: DecisionState,
  role: StandardRole
): boolean {
  return DECISION_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.allowedRoles.includes(role)
  );
}

/** Whether a string is a recognised decision state. */
export function isDecisionState(value: string): value is DecisionState {
  return (DECISION_STATES as string[]).includes(value);
}
