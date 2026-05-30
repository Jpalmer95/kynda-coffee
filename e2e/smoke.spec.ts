import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Kynda/i);
  });

  test("/menu page loads and shows products", async ({ page }) => {
    await page.goto("/menu");
    await expect(page.locator("body")).toContainText(/menu|coffee|latte|espresso/i);
  });

  test("/order page loads", async ({ page }) => {
    await page.goto("/order");
    await expect(page.locator("body")).toBeVisible();
  });

  test("/shop page loads", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.locator("body")).toBeVisible();
  });
});
