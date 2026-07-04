/**
 * Step 4.4 — Audit Logging Middleware
 *
 * Automatic audit entry creation for all mutation endpoints.
 * Captures actor, action, target, timestamp, and diff.
 * Also logs failed authorization attempts.
 *
 * References:
 *   - docs/phase-0/security-rbac.md (audit requirements)
 *   - docs/phase-0/nfr.md (p95 < 1s retrieval)
 *   - src/db/schema/audit.ts (audit_entries table)
 */

import { db } from "@/db";
import { auditEntries } from "@/db/schema";
import type { AuthContext } from "@/lib/auth";
import type { AuditTargetType, AuditAction } from "./audit-types";

// ── Types ───────────────────────────────────────────────────────────────────

export interface AuditLogParams {
  /** The authenticated user performing the action. */
  auth: AuthContext;
  /** The mutation type. */
  action: AuditAction;
  /** The entity type being acted on. */
  targetType: AuditTargetType;
  /** The ID of the entity being acted on. */
  targetId: string;
  /** Display name of the target for human-readable logs. */
  targetDisplayName?: string;
  /** Field-level diff for update operations: { field: { old, new } }. */
  diff?: Record<string, unknown>;
  /** HTTP request context for compliance. */
  request?: Request;
}

export interface FailedAuthLogParams {
  /** The user who attempted the action (if known). */
  auth?: AuthContext;
  /** The action that was denied. */
  action: AuditAction;
  /** The target type. */
  targetType: AuditTargetType;
  /** The target ID (if known). */
  targetId?: string;
  /** Reason for the denial. */
  reason: string;
  /** HTTP request context. */
  request?: Request;
}

// ── Request Context Extraction ──────────────────────────────────────────────

function extractRequestContext(request?: Request) {
  if (!request) return undefined;

  return {
    ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    method: request.method,
    path: new URL(request.url).pathname,
  };
}

// ── Diff Computation ────────────────────────────────────────────────────────

/**
 * Compute a field-level diff between two objects.
 * Only includes fields that actually changed.
 *
 * @param oldRecord - The record before the update
 * @param newRecord - The record after the update
 * @param fields - Optional list of fields to compare (defaults to all keys in newRecord)
 * @returns A diff object: { field: { old: ..., new: ... } } or undefined if no changes
 */
export function computeDiff(
  oldRecord: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  fields?: string[]
): Record<string, { old: unknown; new: unknown }> | undefined {
  const keysToCheck = fields ?? Object.keys(newRecord);
  const diff: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of keysToCheck) {
    const oldVal = oldRecord[key];
    const newVal = newRecord[key];

    // Simple shallow comparison — deep objects are compared by JSON string
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(diff).length > 0 ? diff : undefined;
}

// ── Audit Log Functions ─────────────────────────────────────────────────────

/**
 * Write an audit log entry for a successful mutation.
 *
 * Fire-and-forget by default — errors are caught and logged
 * to avoid failing the user's request due to audit writes.
 *
 * @example
 * await writeAuditLog({
 *   auth,
 *   action: "create",
 *   targetType: "Application",
 *   targetId: newApp.id,
 *   targetDisplayName: newApp.name,
 *   request: req,
 * });
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditEntries).values({
      actorId: params.auth.userId,
      actorType: "user",
      actorDisplayName: params.auth.name,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      targetDisplayName: params.targetDisplayName,
      diff: params.diff as Record<string, unknown> | undefined,
      requestContext: extractRequestContext(params.request),
    });
  } catch (err) {
    // Never fail the request due to audit logging — log and continue
    console.error("[Audit] Failed to write audit log:", err);
  }
}

/**
 * Alias of {@link writeAuditLog} for auditing non-fact-sheet mutations
 * (webhooks, surveys, API tokens, admin actions). Same table and semantics;
 * the distinct name documents intent at the call site.
 */
export const auditMutation = writeAuditLog;

/**
 * Write an audit log entry for a failed authorization attempt.
 *
 * Per security-rbac.md: "Record failed authorization attempts
 * with reason and request context."
 */
export async function writeFailedAuthLog(params: FailedAuthLogParams): Promise<void> {
  try {
    await db.insert(auditEntries).values({
      actorId: params.auth?.userId,
      actorType: params.auth ? "user" : "system",
      actorDisplayName: params.auth?.name ?? "Anonymous",
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? "unknown",
      reason: params.reason,
      requestContext: extractRequestContext(params.request),
    });
  } catch (err) {
    console.error("[Audit] Failed to write failed auth log:", err);
  }
}
