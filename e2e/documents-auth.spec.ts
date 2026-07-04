import { test, expect } from "@playwright/test";

/**
 * Authenticated e2e against the PLANV2 dynamic document model.
 * Requires a seeded database — run with:
 *   node --env-file=.env.local ./node_modules/.bin/playwright test
 * Skipped automatically when no real DATABASE_URL is present (public smoke run).
 */
const hasDb = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost");

test.describe("authenticated dynamic documents", () => {
  test.skip(!hasDb, "requires a seeded database");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@vantagemap.dev");
    await page.getByLabel(/^password$/i).fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/localhost:3100\/?$/, { timeout: 15000 });
  });

  test("dashboard lists document types with counts", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /document types/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Applications/i }).first()).toBeVisible();
  });

  test("dynamic documents page renders seeded data", async ({ page }) => {
    await page.goto("/documents/applications");
    await expect(page.getByRole("heading", { name: /applications/i })).toBeVisible();
    // At least one seeded application document is listed.
    await expect(page.getByText(/AI Assistant|CRM|ERP|Portal/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("type introspection API returns configured types", async ({ page }) => {
    // page.request shares the logged-in browser context's session cookie.
    const res = await page.request.get("/api/types");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const slugs = (body.data ?? []).map((t: { slug: string }) => t.slug);
    expect(slugs).toContain("applications");
    expect(slugs).toContain("decisions");
  });
});
