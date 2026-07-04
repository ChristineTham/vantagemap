/**
 * Webhook retry cron endpoint.
 *
 * Durable delivery: failed webhook deliveries are marked `retrying` with a
 * `nextRetryAt`. In-process timers do not survive serverless function
 * termination, so a scheduled invoker (Vercel Cron — see vercel.json) calls this
 * endpoint to pick up due retries and re-attempt them.
 *
 * Protected by CRON_SECRET: Vercel Cron sends `Authorization: Bearer <secret>`.
 * If CRON_SECRET is unset the endpoint refuses to run (fail closed) so it can
 * never be triggered anonymously in production.
 */

import { NextRequest } from "next/server";
import { withErrorHandler, ok, unauthorized } from "@/lib/api-response";
import { processWebhookRetries } from "@/lib/webhook-engine";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return unauthorized("Cron endpoint is not configured");
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return unauthorized("Invalid cron credentials");
  }

  const processed = await processWebhookRetries();
  return ok({ data: { processed } });
});
