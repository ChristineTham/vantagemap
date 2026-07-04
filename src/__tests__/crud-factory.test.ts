/**
 * Phase 5 CRUD Factory — Integration Tests
 *
 * Covers:
 *   Step 6 — CRUD smoke tests (list, get by ID, create, update, delete)
 *   Step 7 — Query parameter handling (pagination, sorting, filtering)
 *   Step 8 — RBAC enforcement (Viewer / Member / Admin roles)
 *
 * All database calls are intercepted via vi.mock so no real DB is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import type { AuthContext } from "@/lib/auth";

// ─── Mocks (must precede imports of the modules that depend on them) ────────

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

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  computeDiff: vi.fn().mockReturnValue(undefined),
}));

vi.mock("@/lib/notifications", () => ({
  notifySubscribers: vi.fn().mockResolvedValue(undefined),
}));

// `after()` schedules post-response work; outside a request scope it throws, so
// stub it to a no-op (the audit/notification side effects are covered elsewhere).
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn() };
});

// ─── Module imports (after mocks) ──────────────────────────────────────────

import { db } from "@/db";
import { requireAuth } from "@/lib/auth";
import {
  createListHandler,
  createGetByIdHandler,
  createCreateHandler,
  createUpdateHandler,
  createDeleteHandler,
  type CrudConfig,
} from "@/lib/crud-factory";
import { businessCapabilities } from "@/db/schema";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const VALID_UUID = "12345678-1234-1234-1234-123456789012";
const OTHER_UUID = "aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb";
const INVALID_ID = "not-a-uuid";

const sampleRow = {
  id: VALID_UUID,
  name: "Customer Management",
  description: null,
  level: "1",
  lifecycle: "Active",
  health: "Good",
  qualitySeal: "Draft",
  maturity: null,
  strategicImportance: null,
  owner: null,
  parentId: null,
  customFields: null,
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

function unauthResult() {
  return {
    ok: false as const,
    response: NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required", correlationId: "x" } },
      { status: 401 }
    ),
  };
}

// ─── DB chain helpers ──────────────────────────────────────────────────────

/**
 * Returns a thenable, chainable mock for db.select() queries.
 * When awaited, resolves with the provided result array.
 */
function selectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "offset", "orderBy"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Make the chain itself awaitable (mirrors Drizzle's QueryPromise)
  chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  chain.catch = (rej: (e: unknown) => unknown) => Promise.resolve(result).catch(rej);
  chain.finally = (fin: () => void) => Promise.resolve(result).finally(fin);
  return chain;
}

/**
 * Returns a chainable mock for db.insert(...).values(...).returning().
 * .returning() resolves with the provided result array.
 */
function insertChain(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });
  return { values };
}

/**
 * Returns a chainable mock for db.update(...).set(...).where(...).returning().
 * .returning() resolves with the provided result array.
 */
function updateChain(result: unknown[]) {
  const inner: Record<string, unknown> = {};
  inner.returning = vi.fn().mockResolvedValue(result);
  inner.where = vi.fn().mockReturnValue(inner);
  return { set: vi.fn().mockReturnValue(inner) };
}

/**
 * Returns a thenable, chainable mock for db.delete(...).where(...).
 * Resolves with undefined when awaited.
 */
function deleteChain() {
  const chain: Record<string, unknown> = {};
  chain.where = vi.fn().mockReturnValue(chain);
  chain.then = (res: () => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(undefined).then(res, rej);
  chain.catch = (rej: (e: unknown) => unknown) => Promise.resolve(undefined).catch(rej);
  chain.finally = (fin: () => void) => Promise.resolve(undefined).finally(fin);
  return chain;
}

// ─── CRUD config under test ────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(255),
  lifecycle: z.enum(["Plan", "Phase In", "Active", "Phase Out", "End of Life"]).optional(),
});

const config: CrudConfig = {
  table: businessCapabilities,
  entityType: "BusinessCapability",
  createSchema,
  updateSchema: createSchema.partial(),
  columnMap: {
    name: businessCapabilities.name,
    lifecycle: businessCapabilities.lifecycle,
    createdAt: businessCapabilities.createdAt,
  },
};

// ─── Request helpers ───────────────────────────────────────────────────────

const BASE = "http://localhost:3000/api/capabilities";

function GET(url = BASE) {
  return new NextRequest(url);
}
function POST(body: unknown) {
  return new NextRequest(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function PATCH(id: string, body: unknown) {
  return new NextRequest(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function DELETE_REQ(id: string) {
  return new NextRequest(`${BASE}/${id}`, { method: "DELETE" });
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ─── Mock aliases (typed for convenience) ─────────────────────────────────

const mockAuth = vi.mocked(requireAuth);
const mockSelect = vi.mocked(db.select);
const mockInsert = vi.mocked(db.insert);
const mockUpdate = vi.mocked(db.update);
const mockDelete = vi.mocked(db.delete);

beforeEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════
// Step 6 — CRUD smoke tests
// ═══════════════════════════════════════════════════════════════════════════

describe("Step 6 — List handler", () => {
  const handler = createListHandler(config);

  it("returns 200 with list envelope including data and meta", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 1 }]) as unknown as ReturnType<typeof db.select>) // count
      .mockReturnValueOnce(selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>); // data

    const res = await handler(GET());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(VALID_UUID);
    expect(body.data[0].name).toBe("Customer Management");
    expect(body.meta).toMatchObject({ page: 1, pageSize: 25, total: 1, totalPages: 1 });
  });

  it("returns empty data array when no records exist", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 0 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(GET());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
    expect(body.meta.totalPages).toBe(0);
  });
});

describe("Step 6 — Get by ID handler", () => {
  const handler = createGetByIdHandler(config);

  it("returns 200 with the entity when found", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect.mockReturnValueOnce(
      selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>
    );

    const res = await handler(GET(`${BASE}/${VALID_UUID}`), ctx(VALID_UUID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(VALID_UUID);
    expect(body.data.name).toBe("Customer Management");
  });

  it("returns 404 when the entity does not exist", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect.mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(GET(`${BASE}/${OTHER_UUID}`), ctx(OTHER_UUID));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for a malformed (non-UUID) ID", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));

    const res = await handler(GET(`${BASE}/${INVALID_ID}`), ctx(INVALID_ID));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });
});

describe("Step 6 — Create handler", () => {
  const handler = createCreateHandler(config);

  it("returns 201 with the created entity", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockInsert.mockReturnValueOnce(
      insertChain([sampleRow]) as unknown as ReturnType<typeof db.insert>
    );

    const res = await handler(POST({ name: "Customer Management", lifecycle: "Active" }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe(VALID_UUID);
    expect(body.data.name).toBe("Customer Management");
  });

  it("returns 400 when a required field is missing", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));

    // 'name' is required but not provided
    const res = await handler(POST({ lifecycle: "Active" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when a field has an invalid enum value", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));

    const res = await handler(POST({ name: "Test", lifecycle: "Nonexistent" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 for an empty JSON body", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));

    const res = await handler(POST({}));

    expect(res.status).toBe(400);
  });
});

describe("Step 6 — Update handler", () => {
  const handler = createUpdateHandler(config);

  it("returns 200 with the updated entity", async () => {
    const updatedRow = { ...sampleRow, lifecycle: "Phase Out" };
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect.mockReturnValueOnce(
      selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>
    );
    mockUpdate.mockReturnValueOnce(
      updateChain([updatedRow]) as unknown as ReturnType<typeof db.update>
    );

    const res = await handler(PATCH(VALID_UUID, { lifecycle: "Phase Out" }), ctx(VALID_UUID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.lifecycle).toBe("Phase Out");
  });

  it("accepts partial updates (PATCH semantics — only changed fields required)", async () => {
    const renamedRow = { ...sampleRow, name: "Renamed" };
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect.mockReturnValueOnce(
      selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>
    );
    mockUpdate.mockReturnValueOnce(
      updateChain([renamedRow]) as unknown as ReturnType<typeof db.update>
    );

    // Only 'name' supplied — all other fields remain unchanged
    const res = await handler(PATCH(VALID_UUID, { name: "Renamed" }), ctx(VALID_UUID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Renamed");
  });

  it("returns 404 when the entity does not exist", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect.mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(PATCH(OTHER_UUID, { name: "X" }), ctx(OTHER_UUID));

    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed (non-UUID) ID", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));

    const res = await handler(PATCH(INVALID_ID, { name: "X" }), ctx(INVALID_ID));

    expect(res.status).toBe(400);
  });
});

describe("Step 6 — Delete handler", () => {
  const handler = createDeleteHandler(config);

  it("returns 204 with no body after successful deletion", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect.mockReturnValueOnce(
      selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>
    );
    mockDelete.mockReturnValueOnce(deleteChain() as unknown as ReturnType<typeof db.delete>);

    const res = await handler(DELETE_REQ(VALID_UUID), ctx(VALID_UUID));

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });

  it("returns 404 when the entity does not exist", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect.mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(DELETE_REQ(OTHER_UUID), ctx(OTHER_UUID));

    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed (non-UUID) ID", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));

    const res = await handler(DELETE_REQ(INVALID_ID), ctx(INVALID_ID));

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Step 7 — Query parameter handling
// ═══════════════════════════════════════════════════════════════════════════

describe("Step 7 — Pagination", () => {
  const handler = createListHandler(config);

  it("returns default page=1 and pageSize=25 when params are omitted", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 0 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(GET());
    const body = await res.json();

    expect(body.meta.page).toBe(1);
    expect(body.meta.pageSize).toBe(25);
  });

  it("respects explicit page and pageSize params", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 50 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(GET(`${BASE}?page=2&pageSize=10`));
    const body = await res.json();

    expect(body.meta.page).toBe(2);
    expect(body.meta.pageSize).toBe(10);
    expect(body.meta.total).toBe(50);
    expect(body.meta.totalPages).toBe(5);
  });

  it("calculates totalPages correctly for a partial last page", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 11 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(GET(`${BASE}?page=1&pageSize=5`));
    const body = await res.json();

    expect(body.meta.total).toBe(11);
    expect(body.meta.totalPages).toBe(3); // ceil(11/5) = 3
  });

  it("returns 500 when pageSize exceeds maximum allowed", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));

    // parsePagination throws a ZodError → caught by withErrorHandler → 500
    const res = await handler(GET(`${BASE}?pageSize=10000`));

    expect(res.status).toBe(500);
  });

  it("returns 500 when page is less than 1", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));

    const res = await handler(GET(`${BASE}?page=0`));

    expect(res.status).toBe(500);
  });
});

describe("Step 7 — Sorting", () => {
  const handler = createListHandler(config);

  it("sorts by a known column when sortBy and sortDirection are provided", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 1 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(GET(`${BASE}?sortBy=name&sortDirection=asc`));

    expect(res.status).toBe(200);
  });

  it("sorts descending when sortDirection=desc", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 1 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(GET(`${BASE}?sortBy=createdAt&sortDirection=desc`));

    expect(res.status).toBe(200);
  });

  it("silently ignores an unknown sortBy column and returns 200", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 0 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>);

    // 'unknownField' is not in config.columnMap — buildOrderBy returns undefined
    const res = await handler(GET(`${BASE}?sortBy=unknownField`));

    expect(res.status).toBe(200);
  });
});

describe("Step 7 — Filtering", () => {
  const handler = createListHandler(config);

  it("applies filter[field]=value for exact match", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 1 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(GET(`${BASE}?filter[lifecycle]=Active`));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("applies search[field]=value for case-insensitive partial match", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 1 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(GET(`${BASE}?search[name]=Customer`));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("silently ignores filter on an unmapped column and returns all results", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 1 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>);

    // 'unknownField' is not in columnMap — buildWhereConditions skips it
    const res = await handler(GET(`${BASE}?filter[unknownField]=anything`));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("combines multiple filter params", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 1 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>);

    const res = await handler(GET(`${BASE}?filter[lifecycle]=Active&search[name]=Customer`));

    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Step 8 — RBAC enforcement
// ═══════════════════════════════════════════════════════════════════════════

describe("Step 8 — Unauthenticated requests return 401", () => {
  it("GET list → 401", async () => {
    mockAuth.mockResolvedValue(unauthResult());
    const res = await createListHandler(config)(GET());
    expect(res.status).toBe(401);
  });

  it("GET by ID → 401", async () => {
    mockAuth.mockResolvedValue(unauthResult());
    const res = await createGetByIdHandler(config)(GET(`${BASE}/${VALID_UUID}`), ctx(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it("POST → 401", async () => {
    mockAuth.mockResolvedValue(unauthResult());
    const res = await createCreateHandler(config)(POST({ name: "X" }));
    expect(res.status).toBe(401);
  });

  it("PATCH → 401", async () => {
    mockAuth.mockResolvedValue(unauthResult());
    const res = await createUpdateHandler(config)(
      PATCH(VALID_UUID, { name: "X" }),
      ctx(VALID_UUID)
    );
    expect(res.status).toBe(401);
  });

  it("DELETE → 401", async () => {
    mockAuth.mockResolvedValue(unauthResult());
    const res = await createDeleteHandler(config)(DELETE_REQ(VALID_UUID), ctx(VALID_UUID));
    expect(res.status).toBe(401);
  });
});

describe("Step 8 — Viewer role", () => {
  it("can list entities (GET list) → 200", async () => {
    mockAuth.mockResolvedValue(authFor("Viewer"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 0 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>);

    const res = await createListHandler(config)(GET());
    expect(res.status).toBe(200);
  });

  it("can get entity by ID (GET) → 200", async () => {
    mockAuth.mockResolvedValue(authFor("Viewer"));
    mockSelect.mockReturnValueOnce(
      selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>
    );

    const res = await createGetByIdHandler(config)(GET(`${BASE}/${VALID_UUID}`), ctx(VALID_UUID));
    expect(res.status).toBe(200);
  });

  it("cannot create (POST) → 403", async () => {
    mockAuth.mockResolvedValue(authFor("Viewer"));

    const res = await createCreateHandler(config)(POST({ name: "Should Fail" }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toMatch(/Viewer/);
  });

  it("cannot update (PATCH) → 403", async () => {
    mockAuth.mockResolvedValue(authFor("Viewer"));

    const res = await createUpdateHandler(config)(
      PATCH(VALID_UUID, { name: "X" }),
      ctx(VALID_UUID)
    );
    expect(res.status).toBe(403);
  });

  it("cannot delete (DELETE) → 403", async () => {
    mockAuth.mockResolvedValue(authFor("Viewer"));

    const res = await createDeleteHandler(config)(DELETE_REQ(VALID_UUID), ctx(VALID_UUID));
    expect(res.status).toBe(403);
  });
});

describe("Step 8 — Member role", () => {
  it("can list entities (GET list) → 200", async () => {
    mockAuth.mockResolvedValue(authFor("Member"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 0 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([]) as unknown as ReturnType<typeof db.select>);

    const res = await createListHandler(config)(GET());
    expect(res.status).toBe(200);
  });

  it("can get entity by ID (GET) → 200", async () => {
    mockAuth.mockResolvedValue(authFor("Member"));
    mockSelect.mockReturnValueOnce(
      selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>
    );

    const res = await createGetByIdHandler(config)(GET(`${BASE}/${VALID_UUID}`), ctx(VALID_UUID));
    expect(res.status).toBe(200);
  });

  it("can create (POST) → 201", async () => {
    mockAuth.mockResolvedValue(authFor("Member"));
    mockInsert.mockReturnValueOnce(
      insertChain([sampleRow]) as unknown as ReturnType<typeof db.insert>
    );

    const res = await createCreateHandler(config)(POST({ name: "New Capability" }));
    expect(res.status).toBe(201);
  });

  it("can update (PATCH) → 200", async () => {
    const updatedRow = { ...sampleRow, name: "Updated" };
    mockAuth.mockResolvedValue(authFor("Member"));
    mockSelect.mockReturnValueOnce(
      selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>
    );
    mockUpdate.mockReturnValueOnce(
      updateChain([updatedRow]) as unknown as ReturnType<typeof db.update>
    );

    const res = await createUpdateHandler(config)(
      PATCH(VALID_UUID, { name: "Updated" }),
      ctx(VALID_UUID)
    );
    expect(res.status).toBe(200);
  });

  it("cannot delete (DELETE) → 403", async () => {
    mockAuth.mockResolvedValue(authFor("Member"));

    const res = await createDeleteHandler(config)(DELETE_REQ(VALID_UUID), ctx(VALID_UUID));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toMatch(/Member/);
  });
});

describe("Step 8 — Admin role", () => {
  it("can list → 200", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect
      .mockReturnValueOnce(selectChain([{ value: 1 }]) as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>);

    const res = await createListHandler(config)(GET());
    expect(res.status).toBe(200);
  });

  it("can create → 201", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockInsert.mockReturnValueOnce(
      insertChain([sampleRow]) as unknown as ReturnType<typeof db.insert>
    );

    const res = await createCreateHandler(config)(POST({ name: "Admin Cap" }));
    expect(res.status).toBe(201);
  });

  it("can update → 200", async () => {
    const updatedRow = { ...sampleRow, name: "Admin Updated" };
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect.mockReturnValueOnce(
      selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>
    );
    mockUpdate.mockReturnValueOnce(
      updateChain([updatedRow]) as unknown as ReturnType<typeof db.update>
    );

    const res = await createUpdateHandler(config)(
      PATCH(VALID_UUID, { name: "Admin Updated" }),
      ctx(VALID_UUID)
    );
    expect(res.status).toBe(200);
  });

  it("can delete → 204", async () => {
    mockAuth.mockResolvedValue(authFor("Admin"));
    mockSelect.mockReturnValueOnce(
      selectChain([sampleRow]) as unknown as ReturnType<typeof db.select>
    );
    mockDelete.mockReturnValueOnce(deleteChain() as unknown as ReturnType<typeof db.delete>);

    const res = await createDeleteHandler(config)(DELETE_REQ(VALID_UUID), ctx(VALID_UUID));
    expect(res.status).toBe(204);
  });
});
