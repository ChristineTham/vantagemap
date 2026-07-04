/**
 * Step 4.2 + Phase 10 — Authentication Middleware
 *
 * Extracts and validates the authenticated user from the request.
 * Supports two auth modes:
 *   1. Session-based (Better Auth cookie) — for browser users
 *   2. Bearer token — for technical users / API clients
 *
 * Returns an AuthContext with the user's identity and role,
 * or a 401 response if authentication fails.
 *
 * Phase 10: Better Auth session validation is now integrated.
 */

import { db } from "@/db";
import { users, userWorkspaceRoles, apiTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { provisionAppUser } from "@/lib/auth-provision";
import { unauthorized, type ApiErrorBody } from "@/lib/api-response";
import type { NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";

// ── Types ───────────────────────────────────────────────────────────────────

export type StandardRole = "Viewer" | "Member" | "Admin";

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  role: StandardRole;
  workspaceId: string;
}

type AuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse<ApiErrorBody> };

// ── Header Extraction ───────────────────────────────────────────────────────

/**
 * Extract Bearer token from the Authorization header.
 * Returns null if the header is missing or malformed.
 */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

/**
 * Extract session token from cookies.
 * Better Auth stores session in a cookie named `better-auth.session_token`.
 * Returns null if the cookie is not present.
 */
function extractSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  // Parse the cookie header manually to avoid importing a cookie library
  const match = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("better-auth.session_token="));

  if (!match) return null;
  return match.split("=").slice(1).join("=") || null;
}

// ── Authentication Functions ────────────────────────────────────────────────

/**
 * Authenticate a request.
 *
 * Checks in order:
 *   1. Bearer token (API / technical user)
 *   2. Session cookie (browser user)
 *
 * For MVP (before Better Auth is fully wired), this uses a dev-mode
 * bypass: if the `x-dev-user-id` header is set and NODE_ENV is
 * "development", it looks up the user directly.
 *
 * Returns an AuthResult with either the authenticated context or a 401 response.
 */
export async function authenticate(request: Request): Promise<AuthResult> {
  // ── Dev-mode bypass (development only) ──────────────────────────────────
  if (process.env.NODE_ENV === "development") {
    const devUserId = request.headers.get("x-dev-user-id");
    if (devUserId) {
      return resolveUserContext(devUserId);
    }
  }

  // ── Bearer token authentication ─────────────────────────────────────────
  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    return authenticateWithToken(bearerToken);
  }

  // ── Session cookie authentication ───────────────────────────────────────
  const sessionToken = extractSessionToken(request);
  if (sessionToken) {
    return authenticateWithSession(sessionToken);
  }

  return { ok: false, response: unauthorized() };
}

/**
 * Authenticate using a Bearer token.
 * First tries Better Auth session-based token validation.
 * Then checks the api_tokens table for hashed API tokens.
 */
async function authenticateWithToken(token: string): Promise<AuthResult> {
  // Try Better Auth session-based validation first
  try {
    const response = await auth.api.getSession({
      headers: new Headers({ Authorization: `Bearer ${token}` }),
    });

    if (response && response.user) {
      return resolveSessionContext(response.user);
    }
  } catch {
    // Fall through to API token check
  }

  // Check API tokens table (hash and compare)
  try {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const [apiToken] = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.tokenHash, tokenHash))
      .limit(1);

    if (!apiToken) {
      return { ok: false, response: unauthorized("Invalid bearer token") };
    }

    // Check expiry
    if (apiToken.expiresAt && new Date(apiToken.expiresAt) < new Date()) {
      return { ok: false, response: unauthorized("API token has expired") };
    }

    // Update last used timestamp (fire-and-forget)
    db.update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, apiToken.id))
      .catch(() => {});

    return resolveUserContext(apiToken.userId);
  } catch {
    return {
      ok: false,
      response: unauthorized("Bearer token validation failed"),
    };
  }
}

/**
 * Authenticate using a session cookie.
 * Validates the session via Better Auth's session API.
 */
async function authenticateWithSession(sessionToken: string): Promise<AuthResult> {
  try {
    const response = await auth.api.getSession({
      headers: new Headers({
        cookie: `better-auth.session_token=${sessionToken}`,
      }),
    });

    if (!response || !response.user) {
      return {
        ok: false,
        response: unauthorized("Invalid or expired session"),
      };
    }

    return resolveSessionContext(response.user);
  } catch {
    return {
      ok: false,
      response: unauthorized("Session validation failed"),
    };
  }
}

/**
 * Resolve a Better Auth session user into an application AuthContext.
 *
 * Better Auth and the application `users` table are joined by email (their id
 * spaces differ). If no application user exists yet — e.g. the first request
 * right after sign-up — one is provisioned on the default workspace so the
 * session can establish a role.
 */
async function resolveSessionContext(sessionUser: {
  id: string;
  email: string;
  name?: string | null;
}): Promise<AuthResult> {
  const email = sessionUser.email.toLowerCase();

  let [appUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!appUser) {
    await provisionAppUser({ email, name: sessionUser.name ?? email });
    [appUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  }

  if (!appUser || appUser.status !== "Active") {
    return { ok: false, response: unauthorized("User not found or inactive") };
  }

  return resolveUserContext(appUser.id);
}

/**
 * Resolve an application user ID into a full AuthContext by querying the database.
 * Used by the API-token and dev-bypass paths, which key off the application
 * `users.id` (a UUID) rather than the Better Auth id.
 */
async function resolveUserContext(userId: string): Promise<AuthResult> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user || user.status !== "Active") {
    return { ok: false, response: unauthorized("User not found or inactive") };
  }

  // Get the user's workspace role (first workspace for now)
  const [workspaceRole] = await db
    .select()
    .from(userWorkspaceRoles)
    .where(eq(userWorkspaceRoles.userId, userId))
    .limit(1);

  if (!workspaceRole) {
    return {
      ok: false,
      response: unauthorized("User has no workspace access"),
    };
  }

  return {
    ok: true,
    auth: {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: workspaceRole.role as StandardRole,
      workspaceId: workspaceRole.workspaceId,
    },
  };
}

// ── Convenience: require auth in a route handler ────────────────────────────

/**
 * Extract auth context from a request, or return early with a 401.
 *
 * @example
 * export const GET = withErrorHandler(async (req) => {
 *   const auth = await requireAuth(req);
 *   if (!auth.ok) return auth.response;
 *   const { userId, role } = auth.auth;
 *   // ...
 * });
 */
export { authenticate as requireAuth };
