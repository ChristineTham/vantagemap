/**
 * PLANV2 Phase 15 — Decision impact links for a document.
 *
 * GET    /api/documents/[type]/[id]/decision-links
 *   Returns links where this document is the decision OR the affected document.
 * POST   /api/documents/[type]/[id]/decision-links
 *   Body: { documentId, impact, note? } — records an impact link where this
 *   document is the decision and `documentId` is the affected document.
 * DELETE /api/documents/[type]/[id]/decision-links?linkId=<id>
 *   Removes a single impact link.
 */

import { eq, or, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { decisionLinks } from "@/db/schema";
import {
  ok,
  created,
  badRequest,
  noContent,
  notFound,
  withErrorHandler,
  parseBody,
} from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

const IMPACTS = ["affects", "introduces", "retires", "constrains", "supersedes"] as const;

const createSchema = z.object({
  documentId: z.string().uuid(),
  impact: z.enum(IMPACTS),
  note: z.string().max(2000).optional(),
});

export const GET = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ type: string; id: string }> }) => {
    const { id } = await params;

    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const authz = requirePermission(auth.auth, "view");
    if (!authz.ok) return authz.response;

    const links = await db
      .select()
      .from(decisionLinks)
      .where(or(eq(decisionLinks.decisionId, id), eq(decisionLinks.documentId, id)));

    return ok(links);
  }
);

export const POST = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ type: string; id: string }> }) => {
    const { id } = await params;

    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const authz = requirePermission(auth.auth, "edit");
    if (!authz.ok) return authz.response;

    const body = await parseBody(request, createSchema);
    if ("error" in body) return body.error;

    const [link] = await db
      .insert(decisionLinks)
      .values({
        decisionId: id,
        documentId: body.data.documentId,
        impact: body.data.impact,
        note: body.data.note ?? null,
      })
      .returning();

    return created(link);
  }
);

export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ type: string; id: string }> }) => {
    const { id } = await params;

    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const authz = requirePermission(auth.auth, "edit");
    if (!authz.ok) return authz.response;

    const linkId = new URL(request.url).searchParams.get("linkId");
    if (!linkId) {
      return badRequest("Missing required query parameter: linkId");
    }

    // Only allow deleting links attached to this document (as decision or affected).
    const [existing] = await db
      .select()
      .from(decisionLinks)
      .where(
        and(
          eq(decisionLinks.id, linkId),
          or(eq(decisionLinks.decisionId, id), eq(decisionLinks.documentId, id))
        )
      )
      .limit(1);

    if (!existing) {
      return notFound(`Decision link not found: ${linkId}`);
    }

    await db.delete(decisionLinks).where(eq(decisionLinks.id, linkId));

    return noContent();
  }
);
