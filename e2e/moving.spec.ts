import { test, expect } from "@playwright/test";

/**
 * Relocation page (/moving) — smoke + interaction coverage.
 *
 * The page is intentionally short: moving announcement, four renders, map, and
 * the online-ordering links. This spec locks those four sections in.
 */
test.describe("/moving relocation page", () => {
  test("announces the move with the new address", async ({ page }) => {
    await page.goto("/moving");

    await expect(page).toHaveTitle(/Moving|Kynda/i);
    await expect(page.locator("h1")).toHaveText(/we’re moving|we're moving/i);
    await expect(page.locator("body")).toContainText("4909 RM 2147");
    await expect(page.locator("body")).toContainText("Winter 2026");
    await expect(page.locator("body")).toContainText(/same coffee/i);
    await expect(page.locator("body")).toContainText(
      /address changes — to our new specialty coffee house/i
    );
  });

  test("shows the four renders", async ({ page }) => {
    await page.goto("/moving");

    await expect(page.getByRole("button", { name: /^View / })).toHaveCount(4);
    await expect(page.locator('img[alt*="Rendering of the new Kynda Coffee"]')).toHaveCount(4);
  });

  test("embeds the map for the new location", async ({ page }) => {
    await page.goto("/moving");

    await expect(page.locator('iframe[title*="new Kynda Coffee location"]')).toBeVisible();
    await expect(
      page.getByRole("link", { name: /get directions/i }).first()
    ).toHaveAttribute("href", /google\.com\/maps/);
  });

  test("links back to online ordering during the transition", async ({ page }) => {
    await page.goto("/moving");

    await expect(page.getByRole("link", { name: /coffee beans/i })).toHaveAttribute(
      "href",
      "/shop/coffee-beans"
    );
    await expect(page.getByRole("link", { name: /kynda merch/i })).toHaveAttribute(
      "href",
      "/shop/merch"
    );
    await expect(page.locator("body")).toContainText(/food and beverage will be temporarily unavailable/i);
    // Café ordering is offline during the transition — no pickup/menu link here.
    await expect(page.locator('a[href="/order"]')).toHaveCount(0);
  });

  test("lightbox opens on a render and closes on Escape", async ({ page }) => {
    await page.goto("/moving");

    await page.getByRole("button", { name: /^View Front view —/ }).first().click();

    const dialog = page.getByRole("dialog", { name: /enlarged view/ });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("header announcement links to the relocation page", async ({ page }) => {
    await page.goto("/");

    const bannerLink = page
      .getByRole("link", { name: /see what.s coming/i })
      .first();
    await expect(bannerLink).toBeVisible();
    await bannerLink.click();
    await expect(page).toHaveURL(/\/moving$/);
  });
});
