/**
 * PLANV3 Phase 7/8 — Saved Reports & Dashboards API tests.
 *
 * All database, auth, RBAC, and data-source-engine calls are intercepted via
 * vi.mock so no real DB or query execution is needed. Mocks model the chainable
 * Drizzle helpers used in crud-factory.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/auth";

// ─── Mocks (must precede imports of the modules under test) ─────────────────

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/lib/data-source-engine", () => ({
  validateDataSource: vi.fn(),
  executeDataSource: vi.fn(),
}));

// ─── Module imports (after mocks) ──────────────────────────────────────────

import { db } from "@/db";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { validateDataSource, executeDataSource } from "@/lib/data-source-engine";

import { GET as reportsList, POST as reportsCreate } from "@/app/api/saved-reports/route";
import { DELETE as reportDelete } from "@/app/api/saved-reports/[slug]/route";
import { GET as dashboardsList, POST as dashboardsCreate } from "@/app/api/dashboards/route";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const goodDataSource = { mode: "single", typeKey: "Application" };

const sampleReport = {
  id: "12345678-1234-1234-1234-123456789012",
  slug: "my-report",
  name: "My Report",
  description: null,
  ownerId: "u1",
  isSystem: false,
  isShared: true,
  category: "Portfolio",
  dataSource: goodDataSource,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

const systemReport = { ...sampleReport, slug: "system-report", isSystem: true };

const sampleDashboard = {
  id: "aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb",
  slug: "my-dashboard",
  name: "My Dashboard",
  description: null,
  ownerId: "u1",
  isSystem: false,
  isShared: true,
  isDefault: false,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

// ─── Auth helpers ──────────────────────────────────────────────────────────

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

// ─── DB chain helpers (mirror crud-factory.test.ts) ─────────────────────────

function selectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "offset", "orderBy", "groupBy"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  chain.catch = (rej: (e: unknown) => unknown) => Promise.resolve(result).catch(rej);
  chain.finally = (fin: () => void) => Promise.resolve(result).finally(fin);
  return chain;
}

function insertChain(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  // `.values(...)` supports both `.returning()` (create) and being awaited
  // directly (bulk component/widget inserts with no `.returning()`).
  const values = vi.fn().mockImplementation(() => {
    const out: Record<string, unknown> = { returning };
    out.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
    return out;
  });
  return { values };
}

function deleteChain() {
  const chain: Record<string, unknown> = {};
  chain.where = vi.fn().mockReturnValue(chain);
  chain.then = (res: () => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(undefined).then(res, rej);
  chain.catch = (rej: (e: unknown) => unknown) => Promise.resolve(undefined).catch(rej);
  chain.finally = (fin: () => void) => Promise.resolve(undefined).finally(fin);
  return chain;
}

// ─── Request helpers ───────────────────────────────────────────────────────

function reqGet(url: string) {
  return new NextRequest(url);
}
function reqPost(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function reqDelete(url: string) {
  return new NextRequest(url, { method: "DELETE" });
}
function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

// ─── Mock aliases ──────────────────────────────────────────────────────────

const mockAuth = vi.mocked(requireAuth);
const mockPerm = vi.mocked(requirePermission);
const mockSelect = vi.mocked(db.select);
const mockInsert = vi.mocked(db.insert);
const mockDelete = vi.mocked(db.delete);
const mockValidate = vi.mocked(validateDataSource);
const mockExecute = vi.mocked(executeDataSource);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authorized admin, permission granted, data source valid + executes.
  mockAuth.mockResolvedValue(authFor("Admin"));
  mockPerm.mockReturnValue({ ok: true });
  mockValidate.mockImplementation((input) => input as never);
  mockExecute.mockResolvedValue({ items: [] });
});

const REPORTS = "http://localhost:3000/api/saved-reports";
const DASHBOARDS = "http://localhost:3000/api/dashboards";

// ═══════════════════════════════════════════════════════════════════════════
// Saved Reports
// ═══════════════════════════════════════════════════════════════════════════

describe("Saved Reports — list", () => {
  it("returns 200 with the accessible reports", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([sampleReport]) as unknown as ReturnType<typeof db.select>
    );

    const res = await reportsList(reqGet(REPORTS));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].slug).toBe("my-report");
  });
});

describe("Saved Reports — create", () => {
  it("returns 400 when the data source is invalid", async () => {
    mockValidate.mockImplementation(() => {
      throw new ZodError([]);
    });

    const res = await reportsCreate(
      reqPost(REPORTS, {
        slug: "bad-report",
        name: "Bad Report",
        dataSource: { mode: "nope" },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 201 with the created report when the data source is valid", async () => {
    // slug-uniqueness lookup → none; then reload of components after insert.
    mockSelect
      .mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>);
    mockInsert.mockReturnValueOnce(
      insertChain([sampleReport]) as unknown as ReturnType<typeof db.insert>
    );

    const res = await reportsCreate(
      reqPost(REPORTS, {
        slug: "my-report",
        name: "My Report",
        category: "Portfolio",
        dataSource: goodDataSource,
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.slug).toBe("my-report");
    expect(mockValidate).toHaveBeenCalledOnce();
  });
});

describe("Saved Reports — delete", () => {
  it("blocks deletion of a system report (400)", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([systemReport]) as unknown as ReturnType<typeof db.select>
    );

    const res = await reportDelete(reqDelete(`${REPORTS}/system-report`), ctx("system-report"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toMatch(/System reports cannot be deleted/);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("deletes a non-system report (204)", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([sampleReport]) as unknown as ReturnType<typeof db.select>
    );
    mockDelete.mockReturnValueOnce(deleteChain() as unknown as ReturnType<typeof db.delete>);

    const res = await reportDelete(reqDelete(`${REPORTS}/my-report`), ctx("my-report"));

    expect(res.status).toBe(204);
    expect(mockDelete).toHaveBeenCalledOnce();
  });

  it("returns 404 when the report does not exist", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>);

    const res = await reportDelete(reqDelete(`${REPORTS}/missing`), ctx("missing"));

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Dashboards
// ═══════════════════════════════════════════════════════════════════════════

describe("Dashboards — list", () => {
  it("returns 200 with the accessible dashboards", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([sampleDashboard]) as unknown as ReturnType<typeof db.select>
    );

    const res = await dashboardsList(reqGet(DASHBOARDS));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].slug).toBe("my-dashboard");
  });
});

describe("Dashboards — create", () => {
  it("returns 400 when a widget data source is invalid", async () => {
    mockValidate.mockImplementation(() => {
      throw new ZodError([]);
    });

    const res = await dashboardsCreate(
      reqPost(DASHBOARDS, {
        slug: "bad-dashboard",
        name: "Bad Dashboard",
        widgets: [{ componentKey: "chart", dataSource: { mode: "nope" } }],
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 201 with the created dashboard when widget sources are valid", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>) // slug check
      .mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>); // widget reload
    mockInsert
      .mockReturnValueOnce(
        insertChain([sampleDashboard]) as unknown as ReturnType<typeof db.insert>
      ) // dashboard row
      .mockReturnValueOnce(insertChain([]) as unknown as ReturnType<typeof db.insert>); // widgets

    const res = await dashboardsCreate(
      reqPost(DASHBOARDS, {
        slug: "my-dashboard",
        name: "My Dashboard",
        widgets: [{ componentKey: "chart", dataSource: goodDataSource }],
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.slug).toBe("my-dashboard");
    expect(mockValidate).toHaveBeenCalledOnce();
  });
});
