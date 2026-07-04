import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({ db: { select: vi.fn() } }));
vi.mock("@/lib/document-registry", () => ({
  listTypeConfigs: vi.fn(),
  getTypeConfigByKey: vi.fn(),
}));

import { db } from "@/db";
import { listTypeConfigs } from "@/lib/document-registry";
import { MCP_TOOLS_BY_NAME } from "@/lib/mcp/tools";

function selectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit"]) chain[m] = vi.fn().mockReturnValue(chain);
  chain.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  return chain;
}

beforeEach(() => vi.clearAllMocks());

describe("MCP tools", () => {
  it("exposes the expected tool names", () => {
    for (const name of ["list_types", "list_documents", "get_document", "search_documents", "traverse_graph"]) {
      expect(MCP_TOOLS_BY_NAME.has(name)).toBe(true);
    }
  });

  it("list_types returns type keys from the registry", async () => {
    vi.mocked(listTypeConfigs).mockResolvedValue([
      { typeKey: "Application", slug: "applications", displayName: "Application", fields: [{ enabled: true }] },
    ] as never);
    const result = (await MCP_TOOLS_BY_NAME.get("list_types")!.handler({})) as { typeKey: string }[];
    expect(result[0].typeKey).toBe("Application");
    expect(result[0]).toHaveProperty("fieldCount", 1);
  });

  it("list_documents flattens custom fields and caps the limit", async () => {
    vi.mocked(db.select).mockReturnValue(
      selectChain([{ id: "1", typeKey: "Application", name: "A", customFields: { cost: 5 } }]) as never
    );
    const result = (await MCP_TOOLS_BY_NAME.get("list_documents")!.handler({ type: "Application" })) as Record<
      string,
      unknown
    >[];
    expect(result[0]).toMatchObject({ name: "A", cost: 5 });
  });

  it("get_document returns null when not found", async () => {
    vi.mocked(db.select).mockReturnValue(selectChain([]) as never);
    const result = await MCP_TOOLS_BY_NAME.get("get_document")!.handler({ id: "x" });
    expect(result).toBeNull();
  });
});
