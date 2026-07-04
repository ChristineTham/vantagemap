import type { NextConfig } from "next";

/**
 * Security response headers applied to every route.
 *
 * CSP is intentionally strict but allows the inline styles/scripts Next.js and
 * the charting layer need. `frame-ancestors 'none'` (plus X-Frame-Options)
 * blocks clickjacking; HSTS enforces TLS; nosniff blocks MIME sniffing.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https://cdn.jsdelivr.net",
      "font-src 'self' data: https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      // 'unsafe-inline' is required by Next.js' inline bootstrap script.
      // cdn.jsdelivr.net serves the Scalar API-reference bundle on /api/docs.
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "connect-src 'self' https://cdn.jsdelivr.net",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
