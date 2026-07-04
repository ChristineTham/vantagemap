/**
 * PLANV3 Phase 15 — Decision transition API tests.
 *
 * Covers POST /api/documents/decisions/[id]/transition:
 *   - a valid transition succeeds (200)
 *   - an unauthorized-role transition returns 403
 *   - an invalid target returns 400
 *
 * All database / auth / rbac calls are intercepted via vi.mock (no real DB).
 * Mock style follows src/__tests__/crud-factory.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/auth";

// ─── Mocks (must precede imports of the modules under test) ─────────────────

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  requirePermission: vi.fn(),
}));

// ─── Module imports (after mocks) ───────────────────────────────────────────

import { db } from "@/db";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { POST } from "@/app/api/documents/decisions/[id]/transition/route";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const DECISION_ID = "12345678-1234-1234-1234-123456789012";

function decisionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DECISION_ID,
    typeKey: "Decision",
    name: "Adopt PostgreSQL",
    decisionStatus: "Under Review",
    ...overrides,
  };
}

// ─── Auth / rbac helpers ────────────────────────────────────────────────────

function authFor(role: AuthContext["role"]) {
  return {
    ok: true as const,
    auth: {
      userId: "u1",
      email: "test@example.com",
      name: "Test User",
      role,
      workspaceId: "ws1",
    } satisfies AuthContext,
  };
}

const mockAuth = vi.mocked(requireAuth);
const mockPermission = vi.mocked(requirePermission);
const mockSelect = vi.mocked(db.select);
const mockInsert = vi.mocked(db.insert);
const mockUpdate = vi.mocked(db.update);

// ─── DB chain helpers ───────────────────────────────────────────────────────

/** Chainable db.select().from().where().limit() resolving to `result`. */
function selectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "orderBy"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  chain.catch = (rej: (e: unknown) => unknown) => Promise.resolve(result).catch(rej);
  chain.finally = (fin: () => void) => Promise.resolve(result).finally(fin);
  return chain;
}

/** Chainable db.update().set().where().returning() resolving to `result`. */
function updateChain(result: unknown[]) {
  const inner: Record<string, unknown> = {};
  inner.returning = vi.fn().mockResolvedValue(result);
  inner.where = vi.fn().mockReturnValue(inner);
  return { set: vi.fn().mockReturnValue(inner) };
}

/** Chainable db.insert().values() resolving to undefined (no .returning()). */
function insertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

// ─── Request / context helpers ──────────────────────────────────────────────

const BASE = `http://localhost:3000/api/documents/decisions/${DECISION_ID}/transition`;

function transitionReq(body: unknown) {
  return new NextRequest(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(id: string = DECISION_ID) {
  return { params: Promise.resolve({ id }) };
}

/** requirePermission default: allow. Overridden per-test when denial is needed. */
beforeEach(() => {
  vi.clearAllMocks();
  mockPermission.mockReturnValue({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/documents/decisions/[id]/transition", () => {
  it("valid transition succeeds (200) and returns the updated decision", async () => {
    // Under Review → Accepted is allowed for Admin.
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect.mockReturnValueOnce(
      selectChain([decisionRow({ decisionStatus: "Under Review" })]) as unknown as ReturnType<
        typeof db.select
      >
    );
    mockUpdate.mockReturnValueOnce(
      updateChain([decisionRow({ decisionStatus: "Accepted" })]) as unknown as ReturnType<
        typeof db.update
      >
    );
    mockInsert.mockReturnValueOnce(insertChain() as unknown as ReturnType<typeof db.insert>);

    const res = await POST(transitionReq({ to: "Accepted", reason: "Approved by board" }), ctx());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.decisionStatus).toBe("Accepted");
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it("unauthorized-role transition returns 403", async () => {
    // Under Review → Accepted requires Admin; a Member may not perform it.
    mockAuth.mockResolvedValue(authFor("Member"));
    mockSelect.mockReturnValueOnce(
      selectChain([decisionRow({ decisionStatus: "Under Review" })]) as unknown as ReturnType<
        typeof db.select
      >
    );

    const res = await POST(transitionReq({ to: "Accepted" }), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toMatch(/Member/);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("invalid target returns 400", async () => {
    // Proposed → Accepted is not a defined edge for any role.
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect.mockReturnValueOnce(
      selectChain([decisionRow({ decisionStatus: "Proposed" })]) as unknown as ReturnType<
        typeof db.select
      >
    );

    const res = await POST(transitionReq({ to: "Accepted" }), ctx());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
