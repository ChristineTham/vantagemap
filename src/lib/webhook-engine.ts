/**
 * Phase 12.3 — Webhook Event Catalog and Delivery Engine
 *
 * Event naming convention: <entity>.<action>
 * e.g. "application.created", "relationship.deleted", "quality_seal.transitioned"
 *
 * Delivery:
 * - POST to subscriber URL with JSON body
 * - HMAC-SHA256 signature in X-Webhook-Signature header
 * - 5 second timeout per delivery attempt
 * - Exponential backoff: 1min, 5min, 30min (3 attempts total)
 * - Delivery logged to webhook_deliveries table
 */

import { eq, and, lte } from "drizzle-orm";
import { db } from "@/db";
import { webhooks, webhookDeliveries } from "@/db/schema";
import { assertPublicUrl } from "@/lib/ssrf-guard";

// ── Event Catalog ───────────────────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  // Application lifecycle
  "application.created",
  "application.updated",
  "application.deleted",
  // Capability lifecycle
  "capability.created",
  "capability.updated",
  "capability.deleted",
  // Organization lifecycle
  "organization.created",
  "organization.updated",
  "organization.deleted",
  // Objective lifecycle
  "objective.created",
  "objective.updated",
  "objective.deleted",
  // Initiative lifecycle
  "initiative.created",
  "initiative.updated",
  "initiative.deleted",
  // IT Component lifecycle
  "it_component.created",
  "it_component.updated",
  "it_component.deleted",
  // Relationship changes
  "relationship.created",
  "relationship.deleted",
  // Governance events
  "quality_seal.transitioned",
  "tag.assigned",
  "tag.removed",
  // Bulk events
  "bulk.import_completed",
  "bulk.export_completed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/**
 * Column projection for webhook API responses. Deliberately excludes `secret`
 * so the HMAC signing key is never disclosed to API consumers.
 */
export const WEBHOOK_SAFE_COLUMNS = {
  id: webhooks.id,
  url: webhooks.url,
  events: webhooks.events,
  active: webhooks.active,
  name: webhooks.name,
  description: webhooks.description,
  createdBy: webhooks.createdBy,
  createdAt: webhooks.createdAt,
  updatedAt: webhooks.updatedAt,
} as const;

// ── Webhook Payload Type ────────────────────────────────────────────────────

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: {
    userId?: string;
    correlationId?: string;
  };
}

// ── HMAC Signing ────────────────────────────────────────────────────────────

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Delivery Engine ─────────────────────────────────────────────────────────

/**
 * Dispatch an event to all matching active webhook subscribers.
 * Non-blocking — fires and forgets (delivery tracked in DB).
 */
export async function dispatchWebhookEvent(
  event: string,
  data: Record<string, unknown>,
  metadata?: { userId?: string; correlationId?: string }
) {
  // Find all active webhooks that subscribe to this event
  const activeWebhooks = await db.select().from(webhooks).where(eq(webhooks.active, true));

  // Filter webhooks whose events array includes this event (or wildcard *)
  const matching = activeWebhooks.filter((wh) => {
    const events = wh.events as string[];
    return events.includes(event) || events.includes("*");
  });

  if (matching.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
    metadata,
  };

  // Create delivery records and attempt first delivery
  const deliveryPromises = matching.map(async (wh) => {
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId: wh.id,
        event,
        payload: payload as unknown as Record<string, unknown>,
        status: "pending",
        attempts: 0,
        maxAttempts: 3,
      })
      .returning();

    // Fire-and-forget first delivery attempt
    attemptDelivery(delivery.id, wh.url, wh.secret, payload).catch(() => {
      // Errors are tracked in the delivery record
    });
  });

  await Promise.allSettled(deliveryPromises);
}

/**
 * Attempt a single webhook delivery.
 */
async function attemptDelivery(
  deliveryId: string,
  url: string,
  secret: string | null,
  payload: WebhookPayload
): Promise<void> {
  const payloadStr = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "VantageMap-Webhooks/1.0",
    "X-Webhook-Event": payload.event,
  };

  if (secret) {
    headers["X-Webhook-Signature"] = `sha256=${await signPayload(payloadStr, secret)}`;
  }

  const startTime = Date.now();
  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;

  try {
    // SSRF guard — reject targets that resolve to internal/private ranges.
    await assertPublicUrl(url, { resolveDns: true });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: controller.signal,
      redirect: "error", // never follow redirects — a 30x could bounce to an internal host
    });

    clearTimeout(timeout);
    statusCode = response.status;
    // Response bodies are not surfaced to API consumers (see routes), but we
    // still record a short diagnostic slice for delivery troubleshooting.
    responseBody = (await response.text()).slice(0, 4096); // Truncate to 4KB

    if (response.ok) {
      // Successful delivery
      await db
        .update(webhookDeliveries)
        .set({
          status: "delivered",
          statusCode,
          responseBody,
          attempts: 1,
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, deliveryId));
      return;
    }

    errorMessage = `HTTP ${statusCode}: ${responseBody?.slice(0, 200)}`;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
  }

  // Failed — schedule retry with exponential backoff
  const [current] = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, deliveryId));

  const attempts = (current?.attempts ?? 0) + 1;
  const maxAttempts = current?.maxAttempts ?? 3;

  if (attempts >= maxAttempts) {
    // Exhausted retries
    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        statusCode,
        responseBody,
        errorMessage,
        attempts,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      })
      .where(eq(webhookDeliveries.id, deliveryId));
  } else {
    // Schedule next retry (exponential: 1min, 5min, 30min)
    const delayMs = [60_000, 300_000, 1_800_000][attempts - 1] ?? 1_800_000;
    await db
      .update(webhookDeliveries)
      .set({
        status: "retrying",
        statusCode,
        responseBody,
        errorMessage,
        attempts,
        durationMs: Date.now() - startTime,
        nextRetryAt: new Date(Date.now() + delayMs),
      })
      .where(eq(webhookDeliveries.id, deliveryId));
  }
}

/**
 * Process pending retries — called by a cron/scheduler (e.g., Inngest).
 * Picks up deliveries where nextRetryAt <= now and status = "retrying".
 */
export async function processWebhookRetries(): Promise<number> {
  const pending = await db
    .select({
      delivery: webhookDeliveries,
      webhook: webhooks,
    })
    .from(webhookDeliveries)
    .innerJoin(webhooks, eq(webhookDeliveries.webhookId, webhooks.id))
    .where(
      and(eq(webhookDeliveries.status, "retrying"), lte(webhookDeliveries.nextRetryAt, new Date()))
    )
    .limit(50); // Process in batches

  for (const { delivery, webhook } of pending) {
    const payload = delivery.payload as unknown as WebhookPayload;
    await attemptDelivery(delivery.id, webhook.url, webhook.secret, payload);
  }

  return pending.length;
}
