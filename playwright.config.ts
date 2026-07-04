import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e configuration.
 *
 * Boots the built app on port 3100 (env validation skipped; a dummy auth secret
 * and DB URL are supplied so modules import cleanly). The smoke suite covers
 * public routes and the auth-redirect flow, which do not touch the database.
 * Run: `npm run build && npm run test:e2e`.
 */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `next start -p ${PORT}`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      SKIP_ENV_VALIDATION: "true",
      NODE_ENV: "production",
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-1234",
      BETTER_AUTH_URL: BASE_URL,
      NEXT_PUBLIC_APP_URL: BASE_URL,
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db?sslmode=require",
    },
  },
});
