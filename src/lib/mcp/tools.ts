/**
 * PLANV3 — MCP tool definitions for the VantageMap document model.
 *
 * Each tool delegates to the same data layer used by REST/GraphQL. Pure-ish
 * async handlers (DB-backed) so they can be unit-tested with a mocked db.
 */

import { eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { documents, relationships } from "@/db/schema";
import { listTypeConfigs, getTypeConfigByKey } from "@/lib/document-registry";
import { flattenDocument } from "@/lib/document-data";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

const NODE_CAP = 200;

export const MCP_TOOLS: McpTool[] = [
  {
    name: "list_types",
    description: "List all document (fact sheet) types with their slugs and field counts.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const types = await listTypeConfigs();
      return types.map((t) => ({
        typeKey: t.typeKey,
        slug: t.slug,
        displayName: t.displayName,
        fieldCount: t.fields.filter((f) => f.enabled).length,
      }));
    },
  },
  {
    name: "list_documents",
    description: "List documents of a given type. Args: { type: string, limit?: number }.",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string" }, limit: { type: "number" } },
      required: ["type"],
    },
    handler: async (args) => {
      const typeKey = String(args.type);
      const limit = Math.min(Number(args.limit ?? 50), NODE_CAP);
      const rows = await db
        .select()
        .from(documents)
        .where(eq(documents.typeKey, typeKey))
        .limit(limit);
      return rows.map((r) => flattenDocument(r));
    },
  },
  {
    name: "get_document",
    description: "Get a single document by id. Args: { id: string }.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    handler: async (args) => {
      const [row] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, String(args.id)))
        .limit(1);
      return flattenDocument(row) ?? null;
    },
  },
  {
    name: "search_documents",
    description: "Full-text-ish search across document names. Args: { query: string, limit?: number }.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "number" } },
      required: ["query"],
    },
    handler: async (args) => {
      const q = `%${String(args.query)}%`;
      const limit = Math.min(Number(args.limit ?? 25), NODE_CAP);
      const rows = await db
        .select()
        .from(documents)
        .where(or(ilike(documents.name, q), ilike(documents.description, q)))
        .limit(limit);
      return rows.map((r) => ({ id: r.id, typeKey: r.typeKey, name: r.name }));
    },
  },
  {
    name: "get_relationships",
    description: "Get relationships for a document. Args: { id: string }.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    handler: async (args) => {
      const id = String(args.id);
      const rows = await db
        .select()
        .from(relationships)
        .where(or(eq(relationships.sourceId, id), eq(relationships.targetId, id)));
      return rows;
    },
  },
  {
    name: "traverse_graph",
    description:
      "Traverse the relationship graph from a starting document (blast radius). Args: { startId: string, depth?: number }.",
    inputSchema: {
      type: "object",
      properties: { startId: { type: "string" }, depth: { type: "number" } },
      required: ["startId"],
    },
    handler: async (args) => {
      const start = String(args.startId);
      const maxDepth = Math.min(Number(args.depth ?? 2), 3);
      const visited = new Set<string>([start]);
      let frontier = [start];
      const edges: { sourceId: string; targetId: string; relationshipType: string }[] = [];

      for (let d = 0; d < maxDepth && frontier.length > 0 && visited.size < NODE_CAP; d++) {
        const rows = await db
          .select()
          .from(relationships)
          .where(
            or(inArray(relationships.sourceId, frontier), inArray(relationships.targetId, frontier))
          );
        const next: string[] = [];
        for (const r of rows) {
          edges.push({ sourceId: r.sourceId, targetId: r.targetId, relationshipType: r.relationshipType });
          for (const nid of [r.sourceId, r.targetId]) {
            if (!visited.has(nid)) {
              visited.add(nid);
              next.push(nid);
            }
          }
        }
        frontier = next;
      }

      const nodeRows =
        visited.size > 0
          ? await db.select().from(documents).where(inArray(documents.id, [...visited]))
          : [];
      return { nodes: nodeRows.map((n) => ({ id: n.id, typeKey: n.typeKey, name: n.name })), edges };
    },
  },
  {
    name: "get_type_config",
    description: "Get the full field configuration for a document type. Args: { typeKey: string }.",
    inputSchema: {
      type: "object",
      properties: { typeKey: { type: "string" } },
      required: ["typeKey"],
    },
    handler: async (args) => {
      const t = await getTypeConfigByKey(String(args.typeKey));
      if (!t) return null;
      return {
        typeKey: t.typeKey,
        displayName: t.displayName,
        fields: t.fields
          .filter((f) => f.enabled)
          .map((f) => ({ fieldKey: f.fieldKey, label: f.label, dataType: f.dataType, required: f.required })),
      };
    },
  },
];

export const MCP_TOOLS_BY_NAME = new Map(MCP_TOOLS.map((t) => [t.name, t]));
