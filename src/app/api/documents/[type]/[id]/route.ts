/**
 * PLANV3 — Unified document item endpoint.
 *
 * GET    /api/documents/[type]/[id]
 * PATCH  /api/documents/[type]/[id]
 * DELETE /api/documents/[type]/[id]
 */

import { withErrorHandler, notFound } from "@/lib/api-response";
import { getTypeConfigBySlug } from "@/lib/document-registry";
import { getDocument, updateDocument, deleteDocument } from "@/lib/document-crud";

type Ctx = { params: Promise<{ type: string; id: string }> };

export const GET = withErrorHandler(async (request: Request, ctx: Ctx) => {
  const { type, id } = await ctx.params;
  const typeConfig = await getTypeConfigBySlug(type);
  if (!typeConfig || !typeConfig.isActive) return notFound("Document type");
  return getDocument(request, typeConfig, id);
});

export const PATCH = withErrorHandler(async (request: Request, ctx: Ctx) => {
  const { type, id } = await ctx.params;
  const typeConfig = await getTypeConfigBySlug(type);
  if (!typeConfig || !typeConfig.isActive) return notFound("Document type");
  return updateDocument(request, typeConfig, id);
});

export const DELETE = withErrorHandler(async (request: Request, ctx: Ctx) => {
  const { type, id } = await ctx.params;
  const typeConfig = await getTypeConfigBySlug(type);
  if (!typeConfig || !typeConfig.isActive) return notFound("Document type");
  return deleteDocument(request, typeConfig, id);
});
