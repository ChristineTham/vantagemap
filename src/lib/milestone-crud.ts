/**
 * PLANV2 — Milestone CRUD handlers (documents' dated checkpoints).
 */

import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { milestones } from "@/db/schema";
import { ok, created, noContent, notFound, badRequest, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
  date: z.string().min(1),
  status: z.enum(["Planned", "In Progress", "Achieved", "Missed", "Cancelled"]).optional(),
  milestoneType: z.string().max(50).nullish(),
  sortOrder: z.number().int().optional(),
});
const updateSchema = createSchema.partial();

export async function listMilestones(request: Request, documentId: string) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "view");
  if (!authz.ok) return authz.response;
  if (!UUID_RE.test(documentId)) return badRequest("Invalid document id");

  const rows = await db
    .select()
    .from(milestones)
    .where(eq(milestones.documentId, documentId))
    .orderBy(asc(milestones.date));
  return ok(rows);
}

export async function createMilestone(request: Request, documentId: string) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "edit");
  if (!authz.ok) return authz.response;
  if (!UUID_RE.test(documentId)) return badRequest("Invalid document id");

  const parsed = await parseBody(request, createSchema);
  if ("error" in parsed) return parsed.error;

  const [row] = await db
    .insert(milestones)
    .values({ ...parsed.data, documentId })
    .returning();
  return created(row);
}

export async function updateMilestone(request: Request, id: string) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "edit");
  if (!authz.ok) return authz.response;
  if (!UUID_RE.test(id)) return badRequest("Invalid id");

  const parsed = await parseBody(request, updateSchema);
  if ("error" in parsed) return parsed.error;

  const [row] = await db.update(milestones).set(parsed.data).where(eq(milestones.id, id)).returning();
  if (!row) return notFound("Milestone");
  return ok(row);
}

export async function deleteMilestone(request: Request, id: string) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const authz = requirePermission(auth.auth, "delete");
  if (!authz.ok) return authz.response;
  if (!UUID_RE.test(id)) return badRequest("Invalid id");

  const [row] = await db.delete(milestones).where(eq(milestones.id, id)).returning();
  if (!row) return notFound("Milestone");
  return noContent();
}
