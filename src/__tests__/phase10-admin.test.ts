/**
 * Phase 10 — User Management & API Token Admin Tests
 *
 * Tests for admin route handlers:
 *   - GET  /api/admin/tokens
 *   - POST /api/admin/tokens
 *   - DELETE /api/admin/tokens/[id]
 *   - GET  /api/admin/users
 *   - POST /api/admin/users/invite
 *   - PATCH /api/admin/users/[id]/role
 *   - PATCH /api/admin/users/[id]/status
 *
 * All database calls are intercepted via vi.mock so no real DB is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { AuthContext } from "@/lib/auth";

// ─── Mocks (must precede module imports) ───────────────────────────────────

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  requirePermission: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  auditMutation: vi.fn().mockResolvedValue(undefined),
  computeDiff: vi.fn().mockReturnValue(undefined),
}));

// `after()` schedules post-response work; outside a request scope it throws, so
// stub it to a no-op (audit side effects are covered by the audit mock above).
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn() };
});

// ─── Module imports (after mocks) ──────────────────────────────────────────

import { db } from "@/db";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { GET as tokensGET, POST as tokensPOST } from "@/app/api/admin/tokens/route";
import { DELETE as tokensIdDELETE } from "@/app/api/admin/tokens/[id]/route";
import { GET as usersGET } from "@/app/api/admin/users/route";
import { POST as usersInvitePOST } from "@/app/api/admin/users/invite/route";
import { PATCH as usersRolePATCH } from "@/app/api/admin/users/[id]/role/route";
import { PATCH as usersStatusPATCH } from "@/app/api/admin/users/[id]/status/route";

// ─── Constants ─────────────────────────────────────────────────────────────

const VALID_UUID = "12345678-1234-4234-8234-123456789012";
const USER_UUID = "aaaabbbb-1234-4aaa-8bbb-ffffaaaabbbb";
const TOKEN_UUID = "ccccdddd-5678-4ccc-9ddd-111122223333";
const BASE = "http://localhost:3000";

// ─── Auth helpers ──────────────────────────────────────────────────────────

function adminAuth(): { ok: true; auth: AuthContext } {
  return {
    ok: true as const,
    auth: {
      userId: VALID_UUID,
      email: "admin@example.com",
      name: "Admin User",
      role: "Admin",
      workspaceId: "ws-test",
    } satisfies AuthContext,
  };
}

function viewerAuth(): { ok: true; auth: AuthContext } {
  return {
    ok: true as const,
    auth: {
      userId: USER_UUID,
      email: "viewer@example.com",
      name: "Viewer User",
      role: "Viewer",
      workspaceId: "ws-test",
    } satisfies AuthContext,
  };
}

function unauthResult() {
  return {
    ok: false as const,
    response: NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
          correlationId: "x",
        },
      },
      { status: 401 }
    ),
  };
}

function forbiddenResult() {
  return {
    ok: false as const,
    response: NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
          correlationId: "x",
        },
      },
      { status: 403 }
    ),
  };
}

// ─── DB chain helpers ──────────────────────────────────────────────────────

/** Generic thenable select chain with all common methods */
function selectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "offset", "orderBy"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // $dynamic for users route
  chain["$dynamic"] = vi.fn().mockReturnValue(chain);
  chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  chain.catch = (rej: (e: unknown) => unknown) => Promise.resolve(result).catch(rej);
  chain.finally = (fin: () => void) => Promise.resolve(result).finally(fin);
  return chain;
}

function insertChain(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning, values: vi.fn() });
  return { values };
}

function insertNoReturn() {
  const values = vi.fn().mockResolvedValue(undefined);
  return { values };
}

function updateChain() {
  const inner: Record<string, unknown> = {};
  inner.where = vi.fn().mockResolvedValue(undefined);
  return { set: vi.fn().mockReturnValue(inner) };
}

function deleteChain() {
  const chain: Record<string, unknown> = {};
  chain.where = vi.fn().mockResolvedValue(undefined);
  return chain;
}

// ─── Request helpers ───────────────────────────────────────────────────────

function makeRequest(url: string, method = "GET", body?: unknown): NextRequest {
  const opts: RequestInit = { method };
  if (body !== undefined) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  return new Request(`${BASE}${url}`, opts) as unknown as NextRequest;
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAuth).mockResolvedValue(adminAuth());
  vi.mocked(requirePermission).mockReturnValue({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// Token routes
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/admin/tokens", () => {
  const sampleTokens = [
    {
      id: TOKEN_UUID,
      name: "CI Token",
      prefix: "vmap_a1b2c3",
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
  ];

  it("returns list of tokens for admin", async () => {
    vi.mocked(db.select).mockReturnValueOnce(selectChain(sampleTokens) as never);

    const res = await tokensGET(makeRequest("/api/admin/tokens"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("CI Token");
    expect(body.meta).toMatchObject({ page: 1, pageSize: 100, total: 1 });
  });

  it("returns empty list when no tokens exist", async () => {
    vi.mocked(db.select).mockReturnValueOnce(selectChain([]) as never);

    const res = await tokensGET(makeRequest("/api/admin/tokens"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(unauthResult() as never);

    const res = await tokensGET(makeRequest("/api/admin/tokens"));

    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(viewerAuth() as never);
    vi.mocked(requirePermission).mockReturnValueOnce(forbiddenResult() as never);

    const res = await tokensGET(makeRequest("/api/admin/tokens"));

    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/tokens", () => {
  const sampleRecord = {
    id: TOKEN_UUID,
    name: "My Token",
    prefix: "vmap_aa",
    expiresAt: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  it("creates a token and returns it with the full secret", async () => {
    vi.mocked(db.insert).mockReturnValueOnce(insertChain([sampleRecord]) as never);

    const res = await tokensPOST(makeRequest("/api/admin/tokens", "POST", { name: "My Token" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.name).toBe("My Token");
    // Full token is returned once only
    expect(body.data.token).toMatch(/^vmap_/);
  });

  it("creates a token with expiry", async () => {
    vi.mocked(db.insert).mockReturnValueOnce(insertChain([sampleRecord]) as never);

    const res = await tokensPOST(
      makeRequest("/api/admin/tokens", "POST", { name: "Expiring", expiresInDays: 30 })
    );

    expect(res.status).toBe(201);
  });

  it("returns 400 for missing name", async () => {
    const res = await tokensPOST(makeRequest("/api/admin/tokens", "POST", {}));

    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(unauthResult() as never);

    const res = await tokensPOST(makeRequest("/api/admin/tokens", "POST", { name: "X" }));

    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/admin/tokens/[id]", () => {
  const existingToken = {
    id: TOKEN_UUID,
    name: "Old Token",
    prefix: "vmap_bb",
    workspaceId: "ws-test",
    userId: VALID_UUID,
    tokenHash: "abc",
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("deletes an existing token and returns 204", async () => {
    vi.mocked(db.select).mockReturnValueOnce(selectChain([existingToken]) as never);
    vi.mocked(db.delete).mockReturnValueOnce(deleteChain() as never);

    const res = await tokensIdDELETE(
      makeRequest(`/api/admin/tokens/${TOKEN_UUID}`, "DELETE"),
      ctx(TOKEN_UUID)
    );

    expect(res.status).toBe(204);
  });

  it("returns 404 when token not found", async () => {
    vi.mocked(db.select).mockReturnValueOnce(selectChain([]) as never);

    const res = await tokensIdDELETE(
      makeRequest(`/api/admin/tokens/${TOKEN_UUID}`, "DELETE"),
      ctx(TOKEN_UUID)
    );

    expect(res.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(unauthResult() as never);

    const res = await tokensIdDELETE(
      makeRequest(`/api/admin/tokens/${TOKEN_UUID}`, "DELETE"),
      ctx(TOKEN_UUID)
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(viewerAuth() as never);
    vi.mocked(requirePermission).mockReturnValueOnce(forbiddenResult() as never);

    const res = await tokensIdDELETE(
      makeRequest(`/api/admin/tokens/${TOKEN_UUID}`, "DELETE"),
      ctx(TOKEN_UUID)
    );

    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// User routes
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/admin/users", () => {
  const sampleUsers = [
    {
      id: USER_UUID,
      name: "Alice",
      email: "alice@example.com",
      status: "Active",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
  ];

  it("returns list of users with roles for admin", async () => {
    // First select: users list
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain(sampleUsers) as never)
      // Second select: roles
      .mockReturnValueOnce(selectChain([{ userId: USER_UUID, role: "Member" }]) as never);

    const res = await usersGET(makeRequest("/api/admin/users"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].email).toBe("alice@example.com");
    expect(body.data[0].role).toBe("Member");
  });

  it("defaults to Viewer role when no role assignment found", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain(sampleUsers) as never)
      .mockReturnValueOnce(selectChain([]) as never);

    const res = await usersGET(makeRequest("/api/admin/users"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].role).toBe("Viewer");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(unauthResult() as never);

    const res = await usersGET(makeRequest("/api/admin/users"));

    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(viewerAuth() as never);
    vi.mocked(requirePermission).mockReturnValueOnce(forbiddenResult() as never);

    const res = await usersGET(makeRequest("/api/admin/users"));

    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/users/invite", () => {
  const newUser = {
    id: USER_UUID,
    email: "bob@example.com",
    name: "bob",
    status: "Invited",
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("creates an invited user record", async () => {
    // Check existing user (none found)
    vi.mocked(db.select).mockReturnValueOnce(selectChain([]) as never);
    // Insert user
    vi.mocked(db.insert)
      .mockReturnValueOnce(insertChain([newUser]) as never)
      // Insert role
      .mockReturnValueOnce(insertNoReturn() as never);

    const res = await usersInvitePOST(
      makeRequest("/api/admin/users/invite", "POST", {
        email: "bob@example.com",
        role: "Member",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.email).toBe("bob@example.com");
    expect(body.data.status).toBe("Invited");
    expect(body.data.role).toBe("Member");
  });

  it("returns 409 when user already exists", async () => {
    vi.mocked(db.select).mockReturnValueOnce(
      selectChain([{ id: USER_UUID, email: "bob@example.com" }]) as never
    );

    const res = await usersInvitePOST(
      makeRequest("/api/admin/users/invite", "POST", {
        email: "bob@example.com",
      })
    );

    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid email", async () => {
    const res = await usersInvitePOST(
      makeRequest("/api/admin/users/invite", "POST", { email: "not-an-email" })
    );

    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(unauthResult() as never);

    const res = await usersInvitePOST(
      makeRequest("/api/admin/users/invite", "POST", { email: "x@x.com" })
    );

    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/admin/users/[id]/role", () => {
  it("updates role when user has existing role assignment", async () => {
    const existingRole = {
      id: "role-id-1",
      userId: USER_UUID,
      workspaceId: "ws-test",
      role: "Member",
    };
    vi.mocked(db.select).mockReturnValueOnce(selectChain([existingRole]) as never);
    vi.mocked(db.update).mockReturnValueOnce(updateChain() as never);

    const res = await usersRolePATCH(
      makeRequest(`/api/admin/users/${USER_UUID}/role`, "PATCH", { role: "Admin" }),
      ctx(USER_UUID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.role).toBe("Admin");
    expect(body.data.userId).toBe(USER_UUID);
  });

  it("creates role assignment when none exists", async () => {
    vi.mocked(db.select).mockReturnValueOnce(selectChain([]) as never);
    vi.mocked(db.insert).mockReturnValueOnce(insertNoReturn() as never);

    const res = await usersRolePATCH(
      makeRequest(`/api/admin/users/${USER_UUID}/role`, "PATCH", { role: "Viewer" }),
      ctx(USER_UUID)
    );

    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid role value", async () => {
    const res = await usersRolePATCH(
      makeRequest(`/api/admin/users/${USER_UUID}/role`, "PATCH", { role: "SuperAdmin" }),
      ctx(USER_UUID)
    );

    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(unauthResult() as never);

    const res = await usersRolePATCH(
      makeRequest(`/api/admin/users/${USER_UUID}/role`, "PATCH", { role: "Viewer" }),
      ctx(USER_UUID)
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(viewerAuth() as never);
    vi.mocked(requirePermission).mockReturnValueOnce(forbiddenResult() as never);

    const res = await usersRolePATCH(
      makeRequest(`/api/admin/users/${USER_UUID}/role`, "PATCH", { role: "Viewer" }),
      ctx(USER_UUID)
    );

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/users/[id]/status", () => {
  const existingUser = {
    id: USER_UUID,
    name: "Bob",
    email: "bob@example.com",
    status: "Active",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("updates user status to Archived", async () => {
    vi.mocked(db.select).mockReturnValueOnce(selectChain([existingUser]) as never);
    vi.mocked(db.update).mockReturnValueOnce(updateChain() as never);

    const res = await usersStatusPATCH(
      makeRequest(`/api/admin/users/${USER_UUID}/status`, "PATCH", {
        status: "Archived",
      }),
      ctx(USER_UUID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe("Archived");
    expect(body.data.userId).toBe(USER_UUID);
  });

  it("returns 400 when trying to archive yourself", async () => {
    // Current user is admin (VALID_UUID), target is also VALID_UUID (self)
    const res = await usersStatusPATCH(
      makeRequest(`/api/admin/users/${VALID_UUID}/status`, "PATCH", {
        status: "Archived",
      }),
      ctx(VALID_UUID)
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(db.select).mockReturnValueOnce(selectChain([]) as never);

    const res = await usersStatusPATCH(
      makeRequest(`/api/admin/users/${USER_UUID}/status`, "PATCH", {
        status: "Archived",
      }),
      ctx(USER_UUID)
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid status value", async () => {
    const res = await usersStatusPATCH(
      makeRequest(`/api/admin/users/${USER_UUID}/status`, "PATCH", {
        status: "Suspended",
      }),
      ctx(USER_UUID)
    );

    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(unauthResult() as never);

    const res = await usersStatusPATCH(
      makeRequest(`/api/admin/users/${USER_UUID}/status`, "PATCH", {
        status: "Archived",
      }),
      ctx(USER_UUID)
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce(viewerAuth() as never);
    vi.mocked(requirePermission).mockReturnValueOnce(forbiddenResult() as never);

    const res = await usersStatusPATCH(
      makeRequest(`/api/admin/users/${USER_UUID}/status`, "PATCH", {
        status: "Archived",
      }),
      ctx(USER_UUID)
    );

    expect(res.status).toBe(403);
  });
});
