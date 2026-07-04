/**
 * Phase 10 — Better Auth Client
 *
 * Client-side auth utilities for sign-in, sign-up, sign-out,
 * session management, and user operations.
 *
 * Import this in Client Components ("use client") for auth interactions.
 */

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // Same-origin by default: in the browser Better Auth infers the origin from
  // window.location, so auth requests always target the host that served the
  // app. NEXT_PUBLIC_APP_URL (inlined at build time) overrides only when set.
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : undefined),
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
