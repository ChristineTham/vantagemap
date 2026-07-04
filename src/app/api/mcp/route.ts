/**
 * PLANV2 — MCP endpoint (JSON-RPC over HTTP).
 *
 * Exposes the VantageMap document model as MCP tools for AI clients. Supports
 * `initialize`, `tools/list`, and `tools/call`. Authenticated; write tools are
 * gated by RBAC (this build ships read tools only). A lightweight transport so
 * it runs inside a Next.js route handler.
 */

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { MCP_TOOLS, MCP_TOOLS_BY_NAME } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2024-11-05";

function rpcResult(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: "2.0", id, result });
}
function rpcError(id: unknown, code: number, message: string, status = 200) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  let body: { id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const { id, method, params } = body;

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "vantagemap", version: "1.0.0" },
      });

    case "tools/list":
      return rpcResult(id, {
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });

    case "tools/call": {
      const name = String(params?.name ?? "");
      const tool = MCP_TOOLS_BY_NAME.get(name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`);
      try {
        const result = await tool.handler((params?.arguments as Record<string, unknown>) ?? {});
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      } catch (err) {
        return rpcResult(id, {
          isError: true,
          content: [{ type: "text", text: err instanceof Error ? err.message : "Tool error" }],
        });
      }
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export function GET() {
  return Response.json({
    name: "VantageMap MCP",
    transport: "http-jsonrpc",
    methods: ["initialize", "tools/list", "tools/call"],
    tools: MCP_TOOLS.map((t) => t.name),
  });
}
