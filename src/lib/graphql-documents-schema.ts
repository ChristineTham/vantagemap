/**
 * PLANV2 Phase 9 — Dynamic GraphQL schema over the unified document model.
 *
 * Unlike the legacy `graphql-schema.ts` (hardcoded per-entity object types over
 * the pre-PLANV2 tables), this schema exposes a single generic `Document` type
 * backed by the `documents` table plus the generic `relationships` edge table.
 * Type metadata comes from the runtime document registry rather than being baked
 * into the schema, so new document types require no schema changes.
 *
 * Served by `POST /api/graphql/documents`. The legacy endpoint is left intact.
 */

import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  Kind,
  type GraphQLFieldConfigMap,
} from "graphql";
import { and, count, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db";
import { documents, relationships } from "@/db/schema";
import { listTypeConfigs } from "@/lib/document-registry";

// ── JSON scalar ───────────────────────────────────────────────────────────────

/** Passthrough JSON scalar — accepts and returns arbitrary JSON values. */
export const GraphQLJSON = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value (object, array, or scalar).",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: function parseLiteral(ast): unknown {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.NULL:
        return null;
      case Kind.LIST:
        return ast.values.map((v) => parseLiteral(v));
      case Kind.OBJECT: {
        const obj: Record<string, unknown> = {};
        for (const field of ast.fields) {
          obj[field.name.value] = parseLiteral(field.value);
        }
        return obj;
      }
      default:
        return null;
    }
  },
});

// ── Types ───────────────────────────────────────────────────────────────────

type DocumentRow = typeof documents.$inferSelect;

/** Cap for BFS graph traversal so a query can never fan out unbounded. */
const MAX_GRAPH_NODES = 500;
const MAX_GRAPH_DEPTH = 2;

// The Document type references itself (relatedTo/relatedFrom) so its fields are
// built lazily via a thunk.
const DocumentType: GraphQLObjectType = new GraphQLObjectType({
  name: "Document",
  description: "A single document (unified entity) of any configured type.",
  fields: (): GraphQLFieldConfigMap<DocumentRow, unknown> => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    typeKey: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    lifecycle: { type: GraphQLString },
    health: { type: GraphQLString },
    qualitySeal: { type: GraphQLString },
    owner: { type: GraphQLString },
    parentId: { type: GraphQLID },
    customFields: {
      type: GraphQLJSON,
      resolve: (src) => src.customFields ?? null,
    },
    relatedTo: {
      type: new GraphQLList(DocumentType),
      description: "Documents this document points to (outgoing edges).",
      args: {
        targetType: { type: GraphQLString },
        relationshipType: { type: GraphQLString },
      },
      resolve: (src, args: { targetType?: string; relationshipType?: string }) =>
        resolveRelated({ direction: "out", document: src, ...args }),
    },
    relatedFrom: {
      type: new GraphQLList(DocumentType),
      description: "Documents that point to this document (incoming edges).",
      args: {
        sourceType: { type: GraphQLString },
        relationshipType: { type: GraphQLString },
      },
      resolve: (src, args: { sourceType?: string; relationshipType?: string }) =>
        resolveRelated({ direction: "in", document: src, ...args }),
    },
  }),
});

const PageInfoType = new GraphQLObjectType({
  name: "PageInfo",
  fields: {
    page: { type: new GraphQLNonNull(GraphQLInt) },
    pageSize: { type: new GraphQLNonNull(GraphQLInt) },
    total: { type: new GraphQLNonNull(GraphQLInt) },
    totalPages: { type: new GraphQLNonNull(GraphQLInt) },
    hasNextPage: { type: new GraphQLNonNull(GraphQLBoolean) },
    hasPreviousPage: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
});

const DocumentConnectionType = new GraphQLObjectType({
  name: "DocumentConnection",
  fields: {
    nodes: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(DocumentType))) },
    pageInfo: { type: new GraphQLNonNull(PageInfoType) },
    totalCount: { type: new GraphQLNonNull(GraphQLInt) },
  },
});

const TypeConfigType = new GraphQLObjectType({
  name: "TypeConfig",
  description: "A configured document type from the registry.",
  fields: {
    typeKey: { type: new GraphQLNonNull(GraphQLString) },
    slug: { type: new GraphQLNonNull(GraphQLString) },
    displayName: { type: new GraphQLNonNull(GraphQLString) },
    pluralName: { type: new GraphQLNonNull(GraphQLString) },
    icon: { type: GraphQLString },
    isHierarchical: { type: new GraphQLNonNull(GraphQLBoolean) },
    isActive: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
});

const GraphEdgeType = new GraphQLObjectType({
  name: "GraphEdge",
  fields: {
    sourceId: { type: new GraphQLNonNull(GraphQLID) },
    targetId: { type: new GraphQLNonNull(GraphQLID) },
    relationshipType: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const GraphResultType = new GraphQLObjectType({
  name: "GraphResult",
  fields: {
    nodes: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(DocumentType))) },
    edges: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphEdgeType))) },
  },
});

// ── Resolver helpers ──────────────────────────────────────────────────────────

/** Fetch documents connected to `document` in the given direction, optionally filtered. */
async function resolveRelated(opts: {
  direction: "in" | "out";
  document: DocumentRow;
  targetType?: string;
  sourceType?: string;
  relationshipType?: string;
}): Promise<DocumentRow[]> {
  const { direction, document, targetType, sourceType, relationshipType } = opts;

  const edgeConds =
    direction === "out"
      ? [eq(relationships.sourceId, document.id)]
      : [eq(relationships.targetId, document.id)];

  if (relationshipType) {
    edgeConds.push(eq(relationships.relationshipType, relationshipType as never));
  }
  if (direction === "out" && targetType) {
    edgeConds.push(eq(relationships.targetType, targetType as never));
  }
  if (direction === "in" && sourceType) {
    edgeConds.push(eq(relationships.sourceType, sourceType as never));
  }

  const edges = await db
    .select()
    .from(relationships)
    .where(and(...edgeConds));

  const neighborIds = edges.map((e) => (direction === "out" ? e.targetId : e.sourceId));
  if (neighborIds.length === 0) return [];

  return db.select().from(documents).where(inArray(documents.id, neighborIds));
}

/** Validate that a type key exists in the registry; throws a GraphQL-visible error otherwise. */
async function assertTypeExists(typeKey: string): Promise<void> {
  const types = await listTypeConfigs({ includeInactive: true });
  if (!types.some((t) => t.typeKey === typeKey)) {
    throw new Error(`Unknown document type: ${typeKey}`);
  }
}

// ── Query ───────────────────────────────────────────────────────────────────

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    documents: {
      type: new GraphQLNonNull(DocumentConnectionType),
      args: {
        type: { type: new GraphQLNonNull(GraphQLString) },
        page: { type: GraphQLInt },
        pageSize: { type: GraphQLInt },
        search: { type: GraphQLString },
      },
      resolve: async (_src, args: { type: string; page?: number; pageSize?: number; search?: string }) => {
        const page = Math.max(1, args.page ?? 1);
        const pageSize = Math.min(200, Math.max(1, args.pageSize ?? 25));

        const conds = [eq(documents.typeKey, args.type)];
        if (args.search) {
          conds.push(ilike(documents.name, `%${args.search}%`));
        }
        const where = and(...conds);

        const [{ value: total }] = await db
          .select({ value: count() })
          .from(documents)
          .where(where);

        const nodes = await db
          .select()
          .from(documents)
          .where(where)
          .limit(pageSize)
          .offset((page - 1) * pageSize);

        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        return {
          nodes,
          totalCount: total,
          pageInfo: {
            page,
            pageSize,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        };
      },
    },
    document: {
      type: DocumentType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: async (_src, args: { id: string }) => {
        const [row] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, args.id))
          .limit(1);
        return row ?? null;
      },
    },
    types: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(TypeConfigType))),
      resolve: () => listTypeConfigs(),
    },
    graph: {
      type: new GraphQLNonNull(GraphResultType),
      description: "BFS traversal of the relationship graph from a start document.",
      args: {
        startId: { type: new GraphQLNonNull(GraphQLID) },
        depth: { type: GraphQLInt, defaultValue: MAX_GRAPH_DEPTH },
        relationshipTypes: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
      },
      resolve: (_src, args: { startId: string; depth?: number; relationshipTypes?: string[] }) =>
        traverseGraph(args.startId, args.depth ?? MAX_GRAPH_DEPTH, args.relationshipTypes),
    },
  },
});

/** Breadth-first traversal over `relationships`, capped by depth and a node cap. */
async function traverseGraph(
  startId: string,
  requestedDepth: number,
  relationshipTypes?: string[]
): Promise<{
  nodes: DocumentRow[];
  edges: { sourceId: string; targetId: string; relationshipType: string }[];
}> {
  const depth = Math.min(MAX_GRAPH_DEPTH, Math.max(0, requestedDepth));

  const visited = new Set<string>([startId]);
  const edgeSet = new Map<string, { sourceId: string; targetId: string; relationshipType: string }>();
  let frontier: string[] = [startId];

  for (let level = 0; level < depth && frontier.length > 0; level++) {
    if (visited.size >= MAX_GRAPH_NODES) break;

    const conds = [inArray(relationships.sourceId, frontier)];
    if (relationshipTypes && relationshipTypes.length > 0) {
      conds.push(inArray(relationships.relationshipType, relationshipTypes as never[]));
    }
    const outgoing = await db
      .select()
      .from(relationships)
      .where(and(...conds));

    const next: string[] = [];
    for (const e of outgoing) {
      const key = `${e.sourceId}:${e.targetId}:${e.relationshipType}`;
      if (!edgeSet.has(key)) {
        edgeSet.set(key, {
          sourceId: e.sourceId,
          targetId: e.targetId,
          relationshipType: e.relationshipType,
        });
      }
      if (!visited.has(e.targetId) && visited.size < MAX_GRAPH_NODES) {
        visited.add(e.targetId);
        next.push(e.targetId);
      }
    }
    frontier = next;
  }

  const ids = Array.from(visited);
  const nodes = ids.length > 0 ? await db.select().from(documents).where(inArray(documents.id, ids)) : [];

  return { nodes, edges: Array.from(edgeSet.values()) };
}

// ── Mutation ──────────────────────────────────────────────────────────────────

type JsonInput = Record<string, unknown>;

const MutationType = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    createDocument: {
      type: new GraphQLNonNull(DocumentType),
      args: {
        type: { type: new GraphQLNonNull(GraphQLString) },
        input: { type: new GraphQLNonNull(GraphQLJSON) },
      },
      resolve: async (_src, args: { type: string; input: JsonInput }) => {
        await assertTypeExists(args.type);
        const { name, description, customFields, ...rest } = args.input;
        if (typeof name !== "string" || name.length === 0) {
          throw new Error("`name` is required and must be a non-empty string");
        }
        const [row] = await db
          .insert(documents)
          .values({
            typeKey: args.type,
            name,
            description: typeof description === "string" ? description : null,
            customFields: (customFields as Record<string, unknown> | undefined) ?? null,
            ...pickBuiltins(rest),
          })
          .returning();
        return row;
      },
    },
    updateDocument: {
      type: new GraphQLNonNull(DocumentType),
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        input: { type: new GraphQLNonNull(GraphQLJSON) },
      },
      resolve: async (_src, args: { id: string; input: JsonInput }) => {
        const { customFields, ...rest } = args.input;
        const patch: Record<string, unknown> = pickBuiltins(rest);
        if (customFields !== undefined) {
          patch.customFields = customFields as Record<string, unknown> | null;
        }
        const [row] = await db
          .update(documents)
          .set(patch)
          .where(eq(documents.id, args.id))
          .returning();
        if (!row) throw new Error(`Document not found: ${args.id}`);
        return row;
      },
    },
    deleteDocument: {
      type: new GraphQLNonNull(GraphQLBoolean),
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: async (_src, args: { id: string }) => {
        const rows = await db.delete(documents).where(eq(documents.id, args.id)).returning();
        return rows.length > 0;
      },
    },
    createRelationship: {
      type: new GraphQLNonNull(GraphEdgeType),
      args: { input: { type: new GraphQLNonNull(GraphQLJSON) } },
      resolve: async (_src, args: { input: JsonInput }) => {
        const input = args.input;
        const sourceType = requireString(input, "sourceType");
        const sourceId = requireString(input, "sourceId");
        const targetType = requireString(input, "targetType");
        const targetId = requireString(input, "targetId");
        const relationshipType = requireString(input, "relationshipType");

        await Promise.all([assertTypeExists(sourceType), assertTypeExists(targetType)]);

        const [row] = await db
          .insert(relationships)
          .values({
            sourceType: sourceType as never,
            sourceId,
            targetType: targetType as never,
            targetId,
            relationshipType: relationshipType as never,
            description: typeof input.description === "string" ? input.description : null,
            metadata: (input.metadata as Record<string, unknown> | undefined) ?? null,
          })
          .returning();
        return {
          sourceId: row.sourceId,
          targetId: row.targetId,
          relationshipType: row.relationshipType,
        };
      },
    },
    deleteRelationship: {
      type: new GraphQLNonNull(GraphQLBoolean),
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: async (_src, args: { id: string }) => {
        const rows = await db.delete(relationships).where(eq(relationships.id, args.id)).returning();
        return rows.length > 0;
      },
    },
  },
});

/** Keep only known built-in document columns from a loose JSON input. */
function pickBuiltins(input: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set<string>([
    "lifecycle",
    "health",
    "owner",
    "parentId",
    "level",
    "subtype",
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

function requireString(input: JsonInput, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`\`${key}\` is required and must be a non-empty string`);
  }
  return value;
}

// ── Schema ────────────────────────────────────────────────────────────────────

export const documentsSchema = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType,
  types: [DocumentType],
});

export default documentsSchema;
