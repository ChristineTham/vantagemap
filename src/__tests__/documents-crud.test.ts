/**
 * Integration tests for the unified document CRUD handlers (PLANV2).
 * DB, auth, and RBAC are mocked so no live database is needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/rbac", () => ({ requirePermission: vi.fn().mockReturnValue({ ok: true }) }));
vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  computeDiff: vi.fn().mockReturnValue(undefined),
}));
vi.mock("@/lib/notifications", () => ({ notifySubscribers: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/feature-flags", () => ({ isFeatureEnabled: vi.fn().mockReturnValue(false) }));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn() };
});

import { db } from "@/db";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  listDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/document-crud";
import type { ResolvedTypeConfig } from "@/lib/document-registry";

const VALID_UUID = "12345678-1234-1234-1234-123456789012";

function field(over: Partial<Record<string, unknown>>) {
  return {
    id: "f",
    typeConfigId: "tc1",
    fieldSource: "builtin",
    label: "L",
    dataType: "text",
    fieldType: "text",
    enabled: true,
    required: false,
    options: null,
    validation: null,
    defaultValue: null,
    searchable: false,
    filterable: false,
    showInList: false,
    placeholder: null,
    helpText: null,
    group: null,
    width: "full",
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as unknown as ResolvedTypeConfig["fields"][number];
}

const typeConfig = {
  id: "tc1",
  typeKey: "Application",
  slug: "applications",
  displayName: "Application",
  pluralName: "Applications",
  icon: "AppWindow",
  color: null,
  isHierarchical: false,
  milestonesEnabled: false,
  description: null,
  sortOrder: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  fields: [
    field({ fieldKey: "name", dataType: "text", required: true }),
    field({
      fieldKey: "health",
      dataType: "single_select",
      options: [{ value: "Good" }, { value: "Poor" }],
      filterable: true,
    }),
    field({ fieldKey: "contractValue", fieldSource: "custom", dataType: "number" }),
  ],
} as unknown as ResolvedTypeConfig;

const sampleRow = {
  id: VALID_UUID,
  typeKey: "Application",
  name: "App A",
  health: "Good",
  customFields: { contractValue: 1000 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

function selectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "offset", "orderBy", "groupBy"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return chain;
}
function insertChain(result: unknown[]) {
  return { values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(result) }) };
}
function updateChain(result: unknown[]) {
  const inner: Record<string, unknown> = {};
  inner.returning = vi.fn().mockResolvedValue(result);
  inner.where = vi.fn().mockReturnValue(inner);
  return { set: vi.fn().mockReturnValue(inner) };
}
function deleteChain() {
  const chain: Record<string, unknown> = {};
  chain.where = vi.fn().mockReturnValue(chain);
  chain.then = (res: () => unknown) => Promise.resolve(undefined).then(res);
  return chain;
}

const authOk = {
  ok: true as const,
  auth: { userId: "u1", email: "a@b.c", name: "T", role: "Member" as const, workspaceId: "ws1" },
};

function req(body?: unknown, method = "GET") {
  return new NextRequest("http://localhost:3000/api/documents/applications", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAuth).mockResolvedValue(authOk);
  vi.mocked(requirePermission).mockReturnValue({ ok: true });
});

describe("createDocument", () => {
  it("validates, splits custom fields, and returns 201", async () => {
    vi.mocked(db.insert).mockReturnValue(insertChain([sampleRow]) as never);
    const res = await createDocument(req({ name: "App A", health: "Good", contractValue: 1000 }, "POST"), typeConfig);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("App A");
    expect(json.data.contractValue).toBe(1000); // custom field merged into DTO
  });

  it("rejects a payload missing the required name (400)", async () => {
    const res = await createDocument(req({ health: "Good" }, "POST"), typeConfig);
    expect(res.status).toBe(400);
  });

  it("rejects an unknown field (400, strict schema)", async () => {
    const res = await createDocument(req({ name: "x", bogus: 1 }, "POST"), typeConfig);
    expect(res.status).toBe(400);
  });

  it("rejects a select value outside its options (400)", async () => {
    const res = await createDocument(req({ name: "x", health: "Nope" }, "POST"), typeConfig);
    expect(res.status).toBe(400);
  });

  it("returns 403 when the role lacks create permission", async () => {
    vi.mocked(requirePermission).mockReturnValue({
      ok: false,
      response: NextResponse.json({ error: {} }, { status: 403 }),
    } as never);
    const res = await createDocument(req({ name: "x" }, "POST"), typeConfig);
    expect(res.status).toBe(403);
  });
});

describe("read / update / delete", () => {
  it("gets a document by id (200)", async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([sampleRow]) as never);
    const res = await getDocument(req(), typeConfig, VALID_UUID);
    expect(res.status).toBe(200);
  });

  it("returns 400 for an invalid id", async () => {
    const res = await getDocument(req(), typeConfig, "not-a-uuid");
    expect(res.status).toBe(400);
  });

  it("returns 404 when not found", async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([]) as never);
    const res = await getDocument(req(), typeConfig, VALID_UUID);
    expect(res.status).toBe(404);
  });

  it("updates a document (200)", async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([sampleRow]) as never);
    vi.mocked(db.update).mockReturnValue(updateChain([{ ...sampleRow, name: "App B" }]) as never);
    const res = await updateDocument(req({ name: "App B" }, "PATCH"), typeConfig, VALID_UUID);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("App B");
  });

  it("deletes a document (204)", async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([sampleRow]) as never);
    vi.mocked(db.delete).mockReturnValue(deleteChain() as never);
    const res = await deleteDocument(req(undefined, "DELETE"), typeConfig, VALID_UUID);
    expect(res.status).toBe(204);
  });

  it("lists documents with pagination meta (200)", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain([{ value: 1 }]) as never)
      .mockReturnValueOnce(selectChain([sampleRow]) as never);
    const res = await listDocuments(req(), typeConfig);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta.total).toBe(1);
    expect(json.data[0].contractValue).toBe(1000);
  });
});
