import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validated environment variables.
 * Server-side variables are never exposed to the browser.
 * Import `env` instead of `process.env` in application code.
 *
 * Set SKIP_ENV_VALIDATION=true in CI to bypass validation during build.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z
      .string()
      .url("DATABASE_URL must be a valid connection string")
      .refine(
        (url) => url.includes("sslmode=require") || url.includes("sslmode=verify"),
        "DATABASE_URL must include sslmode=require for secure connections to Neon"
      ),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Optional: transactional email (password reset, verification, notifications).
    // When unset, emails are logged in development and skipped in production.
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    // Optional: shared secret guarding the webhook-retry cron endpoint.
    CRON_SECRET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL:
      process.env.NODE_ENV === "production"
        ? z.string().url("NEXT_PUBLIC_APP_URL is required in production")
        : z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  /**
   * Skip env validation during CI builds — set SKIP_ENV_VALIDATION=true.
   * Never skip in production.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
