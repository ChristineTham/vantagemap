/**
 * Phase 10 — Better Auth Server Configuration
 *
 * Central Better Auth instance with plugins for email/password auth,
 * session management, and admin operations.
 *
 * Plugins used:
 *   - Core: email/password authentication
 *   - Admin: user management operations for Admin role
 *
 * Better Auth manages its own tables (user, session, account, verification)
 * via the Drizzle adapter. These are separate from the Phase 3.8 users table
 * which holds VantageMap-specific fields (status lifecycle, workspace roles).
 *
 * Environment variables (auto-read by Better Auth):
 *   - BETTER_AUTH_SECRET — encryption secret (min 32 chars)
 *   - BETTER_AUTH_URL — base URL for auth endpoints
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@/db";
import { sendAuthEmail } from "@/lib/email";
import { provisionAppUser } from "@/lib/auth-provision";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  // baseURL and secret are auto-read from BETTER_AUTH_URL and BETTER_AUTH_SECRET
  // env vars — no need to define them here.

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Reset your VantageMap password",
        heading: "Password reset requested",
        body: "Click the button below to choose a new password. If you didn't request this, you can safely ignore this email.",
        ctaLabel: "Reset password",
        ctaUrl: url,
      });
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Verify your VantageMap email",
        heading: "Confirm your email address",
        body: "Click the button below to verify your email and activate your account.",
        ctaLabel: "Verify email",
        ctaUrl: url,
      });
    },
    sendOnSignUp: true,
  },

  // Persist rate-limit counters in the database so limits hold across serverless
  // instances and cold starts (in-memory storage is per-instance and ineffective
  // on Vercel/Azure).
  rateLimit: {
    enabled: true,
    window: 60, // 60-second window
    max: 10, // max 10 requests per window per IP
    storage: "database",
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Refresh session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  user: {
    additionalFields: {
      avatarUrl: {
        type: "string",
        required: false,
      },
    },
  },

  // Provision the matching application user + default workspace role whenever a
  // Better Auth user is created (sign-up), keeping the two user models in sync.
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await provisionAppUser({ email: createdUser.email, name: createdUser.name });
        },
      },
    },
  },

  plugins: [admin()],

  trustedOrigins: process.env.NEXT_PUBLIC_APP_URL
    ? [process.env.NEXT_PUBLIC_APP_URL]
    : ["http://localhost:3000"],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
