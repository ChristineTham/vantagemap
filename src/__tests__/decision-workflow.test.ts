import { describe, it, expect } from "vitest";
import {
  getValidDecisionTransitions,
  canTransitionDecision,
  isDecisionState,
  DECISION_STATES,
} from "@/lib/decision-workflow";

describe("decision workflow", () => {
  it("lets a Member submit a Proposed decision for review", () => {
    expect(canTransitionDecision("Proposed", "Under Review", "Member")).toBe(true);
  });

  it("only lets an Admin accept a decision under review", () => {
    expect(canTransitionDecision("Under Review", "Accepted", "Admin")).toBe(true);
    expect(canTransitionDecision("Under Review", "Accepted", "Member")).toBe(false);
    expect(canTransitionDecision("Under Review", "Accepted", "Viewer")).toBe(false);
  });

  it("allows Accepted → Superseded / Deprecated for Admin only", () => {
    expect(canTransitionDecision("Accepted", "Superseded", "Admin")).toBe(true);
    expect(canTransitionDecision("Accepted", "Deprecated", "Admin")).toBe(true);
    expect(canTransitionDecision("Accepted", "Superseded", "Member")).toBe(false);
  });

  it("forbids illegal transitions", () => {
    expect(canTransitionDecision("Proposed", "Accepted", "Admin")).toBe(false);
    expect(canTransitionDecision("Superseded", "Accepted", "Admin")).toBe(false);
  });

  it("returns role-scoped valid transitions", () => {
    const memberFromReview = getValidDecisionTransitions("Under Review", "Member").map((t) => t.to);
    expect(memberFromReview).toContain("Proposed"); // revise
    expect(memberFromReview).not.toContain("Accepted"); // admin-only
    const adminFromReview = getValidDecisionTransitions("Under Review", "Admin").map((t) => t.to);
    expect(adminFromReview).toEqual(expect.arrayContaining(["Accepted", "Rejected", "Proposed"]));
  });

  it("recognises valid decision states", () => {
    for (const s of DECISION_STATES) expect(isDecisionState(s)).toBe(true);
    expect(isDecisionState("Nonsense")).toBe(false);
  });

  it("viewers can never transition", () => {
    for (const from of DECISION_STATES) {
      expect(getValidDecisionTransitions(from, "Viewer")).toEqual([]);
    }
  });
});
