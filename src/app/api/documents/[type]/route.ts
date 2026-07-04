/**
 * PLANV3 — Unified document collection endpoint.
 *
 * GET  /api/documents/[type] — list documents of a type
 * POST /api/documents/[type] — create a document (dynamic validation)
 */

import { withErrorHandler, notFound } from "@/lib/api-response";
import { getTypeConfigBySlug } from "@/lib/document-registry";
import { listDocuments, createDocument } from "@/lib/document-crud";

type Ctx = { params: Promise<{ type: string }> };

export const GET = withErrorHandler(async (request: Request, ctx: Ctx) => {
  const { type } = await ctx.params;
  const typeConfig = await getTypeConfigBySlug(type);
  if (!typeConfig || !typeConfig.isActive) return notFound("Document type");
  return listDocuments(request, typeConfig);
});

export const POST = withErrorHandler(async (request: Request, ctx: Ctx) => {
  const { type } = await ctx.params;
  const typeConfig = await getTypeConfigBySlug(type);
  if (!typeConfig || !typeConfig.isActive) return notFound("Document type");
  return createDocument(request, typeConfig);
});
