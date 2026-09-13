import { test, expect } from "@playwright/test";

/**
 * Relocation page (/moving) — smoke + interaction coverage.
 *
 * The page sells a real address and real construction claims, so this spec
 * asserts the published address, the four render slots, the header
 * announcement link, and the gallery lightbox keyboard behaviour.
 */
test.describe("/moving relocation page", () => {
  test("loads with the new address and render slots", async ({ page }) => {
    await page.goto("/moving");

    await expect(page).toHaveTitle(/Moving|Kynda/i);
    await expect(page.locator("h1")).toContainText(/moving/i);
    await expect(page.locator("body")).toContainText("4909 RM 2147");
    await expect(page.locator("body")).toContainText("Winter 2026");

    // Four render slots are always present (image or placeholder).
    await expect(page.getByRole("button", { name: /^View / })).toHaveCount(4);
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

  test("lightbox opens on a slot and closes on Escape", async ({ page }) => {
    await page.goto("/moving");

    await page
      .getByRole("button", { name: /^View Exterior & Entry/ })
      .click();

    const dialog = page.getByRole("dialog", { name: /enlarged view/ });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Exterior & Entry/);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("updates form exposes a labelled email field", async ({ page }) => {
    await page.goto("/moving");

    const email = page.locator("#moving-updates-email");
    await email.scrollIntoViewIfNeeded();
    await expect(email).toBeVisible();
    await expect(page.getByRole("button", { name: /get move updates/i })).toBeVisible();
  });
});
