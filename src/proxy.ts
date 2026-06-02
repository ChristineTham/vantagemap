/**
 * Phase 10 — Next.js Proxy for Route Protection
 *
 * Protects authenticated routes by checking for a valid session cookie.
 * Redirects unauthenticated users to /login.
 *
 * Public routes (login, register, API auth) are excluded from protection.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that do not require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through without auth check
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get("better-auth.session_token");

  if (!sessionToken?.value) {
    // Redirect to login with return URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session exists — allow through (actual validation happens in API routes)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and API auth routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
