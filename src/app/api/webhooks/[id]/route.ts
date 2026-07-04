/**
 * Phase 12.3 — Webhook Instance Routes
 *
 * GET    /api/webhooks/:id           — Get webhook details with recent deliveries
 * PATCH  /api/webhooks/:id           — Update webhook subscription
 * DELETE /api/webhooks/:id           — Delete webhook subscription
 */

import { NextRequest, after } from "next/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { webhooks, webhookDeliveries } from "@/db/schema";
import { withErrorHandler, ok, notFound, badRequest } from "@/lib/api-response";
import { parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { WEBHOOK_SAFE_COLUMNS } from "@/lib/webhook-engine";
import { assertPublicUrl, SsrfError } from "@/lib/ssrf-guard";
import { auditMutation } from "@/lib/audit";

// ── Validation Schemas ──────────────────────────────────────────────────────

const updateWebhookSchema = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.array(z.string().max(100)).min(1).max(50).optional(),
  secret: z.string().max(255).optional(),
  name: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/webhooks/:id ───────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
  if (!isFeatureEnabled("FEATURE_WEBHOOKS_API")) {
    return Response.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Webhooks API not enabled",
          correlationId: crypto.randomUUID(),
        },
      },
      { status: 404 }
    );
  }

  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;

  const authz = requirePermission(authResult.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const { id } = await context.params;

  const [webhook] = await db
    .select(WEBHOOK_SAFE_COLUMNS)
    .from(webhooks)
    .where(eq(webhooks.id, id))
    .limit(1);

  if (!webhook) return notFound("Webhook");

  // Include last 10 deliveries (secret is never selected via WEBHOOK_SAFE_COLUMNS)
  const recentDeliveries = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, id))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(10);

  return ok({
    data: {
      ...webhook,
      recentDeliveries,
    },
  });
});

// ── PATCH /api/webhooks/:id ─────────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
  if (!isFeatureEnabled("FEATURE_WEBHOOKS_API")) {
    return Response.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Webhooks API not enabled",
          correlationId: crypto.randomUUID(),
        },
      },
      { status: 404 }
    );
  }

  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;

  const authz = requirePermission(authResult.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const { id } = await context.params;

  const [existing] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);

  if (!existing) return notFound("Webhook");

  const parsed = await parseBody(request, updateWebhookSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  // SSRF guard when the target URL is being changed.
  if (body.url) {
    if (process.env.NODE_ENV === "production" && !body.url.startsWith("https://")) {
      return badRequest("Webhook URL must use HTTPS in production");
    }
    try {
      await assertPublicUrl(body.url);
    } catch (err) {
      if (err instanceof SsrfError) return badRequest(err.message);
      throw err;
    }
  }

  const [updated] = await db
    .update(webhooks)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(webhooks.id, id))
    .returning(WEBHOOK_SAFE_COLUMNS);

  if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
    after(async () => {
      await auditMutation({
        auth: authResult.auth,
        action: "update",
        targetType: "Webhook",
        targetId: id,
        targetDisplayName: updated.name ?? updated.url,
        request,
      });
    });
  }

  return ok({ data: updated });
});

// ── DELETE /api/webhooks/:id ────────────────────────────────────────────────

export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
  if (!isFeatureEnabled("FEATURE_WEBHOOKS_API")) {
    return Response.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Webhooks API not enabled",
          correlationId: crypto.randomUUID(),
        },
      },
      { status: 404 }
    );
  }

  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;

  const authz = requirePermission(authResult.auth, "manage_workspace");
  if (!authz.ok) return authz.response;

  const { id } = await context.params;

  const [existing] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);

  if (!existing) return notFound("Webhook");

  // Cascade delete also removes delivery records (via FK)
  await db.delete(webhooks).where(eq(webhooks.id, id));

  if (isFeatureEnabled("FEATURE_AUDIT_LOGGING")) {
    after(async () => {
      await auditMutation({
        auth: authResult.auth,
        action: "delete",
        targetType: "Webhook",
        targetId: id,
        targetDisplayName: existing.name ?? existing.url,
        request,
      });
    });
  }

  return new Response(null, { status: 204 });
});
