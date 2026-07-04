import { test, expect } from "@playwright/test";

/**
 * Smoke e2e — public routes and the auth-redirect flow. These paths do not
 * query the database, so they run without a live DB.
 */

test("unauthenticated access to a protected route redirects to login", async ({ page }) => {
  // The root "/" is a public landing page; admin routes are protected.
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login/);
});

test("login page renders the sign-in form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/^password$/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("login has a working link to registration", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /sign up/i }).click();
  await expect(page).toHaveURL(/\/register/);
  await expect(page.getByRole("heading", { name: /create|sign up|register/i })).toBeVisible();
});

test("forgot-password page renders", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByLabel(/email/i)).toBeVisible();
});

test("security headers are present on responses", async ({ page }) => {
  const res = await page.goto("/login");
  expect(res).toBeTruthy();
  const headers = res!.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
});

test("callbackUrl open-redirect is neutralised", async ({ page }) => {
  // An absolute callbackUrl must not be honoured as a redirect target.
  await page.goto("/login?callbackUrl=https://evil.example.com");
  await expect(page).toHaveURL(/localhost:3100/);
});
