/**
 * PLANV3 Phase 9 — dynamic document GraphQL schema tests.
 * DB and the document registry are mocked so no live database is required.
 */
import { describe, it, expect, vi } from "vitest";
import { graphql } from "graphql";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/document-registry", () => ({
  listTypeConfigs: vi.fn().mockResolvedValue([
    {
      typeKey: "Application",
      slug: "applications",
      displayName: "Application",
      pluralName: "Applications",
      icon: "AppWindow",
      isHierarchical: false,
      isActive: true,
    },
    {
      typeKey: "Capability",
      slug: "capabilities",
      displayName: "Capability",
      pluralName: "Capabilities",
      icon: "Boxes",
      isHierarchical: true,
      isActive: true,
    },
  ]),
}));

/** Build a thenable Drizzle-like query chain resolving to `result`. */
function selectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "offset", "orderBy", "groupBy"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return chain;
}

const sampleRows = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    typeKey: "Application",
    name: "App A",
    description: "First app",
    lifecycle: "Active",
    health: "Good",
    qualitySeal: "Draft",
    owner: "alice",
    parentId: null,
    customFields: { contractValue: 1000 },
  },
];

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "@/db";
import { documentsSchema } from "@/lib/graphql-documents-schema";

const mockDb = db as unknown as { select: ReturnType<typeof vi.fn> };

describe("graphql-documents-schema", () => {
  it("resolves the `types` query from the registry without errors", async () => {
    const result = await graphql({
      schema: documentsSchema,
      source: "{ types { typeKey displayName isHierarchical } }",
    });

    expect(result.errors).toBeUndefined();
    const types = (result.data?.types ?? []) as { typeKey: string }[];
    expect(types.map((t) => t.typeKey)).toEqual(["Application", "Capability"]);
  });

  it("resolves a paginated `documents` connection", async () => {
    // First select() call → count(); second → page rows.
    mockDb.select
      .mockReturnValueOnce(selectChain([{ value: 1 }]))
      .mockReturnValueOnce(selectChain(sampleRows));

    const result = await graphql({
      schema: documentsSchema,
      source: `{
        documents(type: "Application", page: 1, pageSize: 25) {
          totalCount
          pageInfo { page pageSize total totalPages hasNextPage hasPreviousPage }
          nodes { id name health customFields }
        }
      }`,
    });

    expect(result.errors).toBeUndefined();
    const conn = result.data?.documents as {
      totalCount: number;
      pageInfo: { page: number; hasNextPage: boolean };
      nodes: { id: string; name: string; customFields: unknown }[];
    };
    expect(conn.totalCount).toBe(1);
    expect(conn.pageInfo.page).toBe(1);
    expect(conn.pageInfo.hasNextPage).toBe(false);
    expect(conn.nodes[0].name).toBe("App A");
    expect(conn.nodes[0].customFields).toEqual({ contractValue: 1000 });
  });

  it("exposes createDocument and graph in the schema", () => {
    const mutation = documentsSchema.getMutationType();
    expect(mutation).toBeDefined();
    expect(Object.keys(mutation!.getFields())).toContain("createDocument");
    expect(Object.keys(mutation!.getFields())).toContain("createRelationship");

    const query = documentsSchema.getQueryType();
    expect(Object.keys(query!.getFields())).toContain("graph");
    expect(Object.keys(query!.getFields())).toContain("document");
  });
});
