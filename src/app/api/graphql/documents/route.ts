/**
 * PLANV3 Phase 9 — GraphQL endpoint for the unified document model.
 *
 * POST /api/graphql/documents — executes queries/mutations against the dynamic
 * document schema (`graphql-documents-schema.ts`). Auth is required. Query depth
 * is bounded via an AST-based depth rule computed from the parsed document, so a
 * deeply-nested relationship traversal cannot be used to fan out unbounded work.
 *
 * The legacy `/api/graphql` endpoint remains available and unchanged.
 */

import { NextRequest } from "next/server";
import { execute, parse, validate, specifiedRules, type DocumentNode } from "graphql";
import { documentsSchema } from "@/lib/graphql-documents-schema";
import { requireAuth } from "@/lib/auth";

/** Maximum allowed selection-set nesting depth. */
const MAX_DEPTH = 6;

/**
 * Compute the maximum selection-set nesting depth of a parsed GraphQL document.
 * Operates on the AST (not brace counting) so aliases, fragments, and comments
 * cannot skew the measurement.
 */
export function computeQueryDepth(doc: DocumentNode): number {
  let max = 0;

  function walk(node: unknown, depth: number): void {
    if (!node || typeof node !== "object") return;
    const anyNode = node as { kind?: string; selectionSet?: unknown; selections?: unknown[] };

    if (anyNode.kind === "Field") {
      depth += 1;
      if (depth > max) max = depth;
    }

    const selectionSet = anyNode.selectionSet as { selections?: unknown[] } | undefined;
    if (selectionSet?.selections) {
      for (const sel of selectionSet.selections) walk(sel, depth);
    }
  }

  for (const def of doc.definitions) {
    const opDef = def as { selectionSet?: { selections?: unknown[] } };
    if (opDef.selectionSet?.selections) {
      for (const sel of opDef.selectionSet.selections) walk(sel, 0);
    }
  }

  return max;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;

  let body: { query?: unknown; variables?: unknown; operationName?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ errors: [{ message: "Invalid JSON body" }] }, { status: 400 });
  }

  const { query, variables, operationName } = body;
  if (typeof query !== "string" || query.length === 0) {
    return Response.json({ errors: [{ message: "`query` string is required" }] }, { status: 400 });
  }

  // Parse
  let document: DocumentNode;
  try {
    document = parse(query);
  } catch (err) {
    return Response.json(
      { errors: [{ message: `Syntax error: ${(err as Error).message}` }] },
      { status: 400 }
    );
  }

  // Depth guard (AST-based)
  const depth = computeQueryDepth(document);
  if (depth > MAX_DEPTH) {
    return Response.json(
      { errors: [{ message: `Query depth ${depth} exceeds maximum allowed depth of ${MAX_DEPTH}` }] },
      { status: 400 }
    );
  }

  // Validate against schema
  const validationErrors = validate(documentsSchema, document, specifiedRules);
  if (validationErrors.length > 0) {
    return Response.json(
      { errors: validationErrors.map((e) => ({ message: e.message, locations: e.locations })) },
      { status: 400 }
    );
  }

  // Execute
  const result = await execute({
    schema: documentsSchema,
    document,
    variableValues: (variables as Record<string, unknown> | null) ?? undefined,
    operationName: typeof operationName === "string" ? operationName : undefined,
    contextValue: { auth: authResult.auth },
  });

  return Response.json(result, { status: 200 });
}

export async function GET() {
  return Response.json(
    {
      message:
        "GraphQL endpoint for the unified document model. Send POST requests with a JSON body { query, variables }.",
    },
    { status: 405, headers: { Allow: "POST" } }
  );
}
