/**
 * Kynda HEB Order Agent — the "Hands" (CDP-connected).
 *
 * Connects to the ALREADY-RUNNING automation browser (Brave CDP on :9222) so it
 * reuses the persistent profile + any saved HEB login. Reads an order TSV
 * (product | qty) and fills the HEB cart.
 *
 * WHY CDP-connect (not launch a new browser): the persistent Brave profile at
 * ~/.hermes/chrome-debug keeps the HEB session alive. Launching a second browser
 * on the same profile would conflict. Login (OTP code) happens in the visible
 * browser; the agent waits, then does the cart-fill.
 *
 * USAGE (repo root):
 *   node scripts/order/heb_order_agent.mjs /tmp/heb_order.tsv
 *
 * ENV:
 *   CDP_URL       — default http://127.0.0.1:9222
 *   HEB_EMAIL     — optional, pre-fills the login email field (never committed)
 *   HEADLESS=1    — unused (requires the visible CDP browser)
 */
import { chromium } from "playwright";
import { readFileSync } from "fs";

const TSV = process.argv[2];
if (!TSV) { console.error("usage: node scripts/order/heb_order_agent.mjs <order.tsv>"); process.exit(1); }

const CDP_URL = process.env.CDP_URL || "http://127.0.0.1:9222";

function parseOrder(path) {
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && !/^product\b/i.test(l))
    .map((l) => {
      const [product, qty] = l.split("\t");
      return { product: product.trim(), qty: parseInt(qty?.trim(), 10) || 0 };
    })
    .filter((o) => o.qty > 0);
}

const order = parseOrder(TSV);
console.log(`Loaded ${order.length} order items.\n`);

async function main() {
  // Connect to the running CDP browser (persistent profile, keeps HEB login).
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  const page = context.pages().find((p) => p.url().includes("heb.com")) || await context.newPage();

  // ---- 1. Ensure logged in (HUMAN enters email + OTP code) ----
  await page.goto("https://www.heb.com/my-account/lists", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const bodyText = await page.evaluate(() => document.body.innerText || "");

  if (/log in|sign in/i.test(bodyText) && bodyText.length < 2000) {
    console.log("→ Not logged in. Opening login (in the browser window)...");
    await page.goto("https://www.heb.com/my-account/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    if (process.env.HEB_EMAIL) {
      try { await page.fill("#email-input", process.env.HEB_EMAIL); console.log("→ Email pre-filled."); }
      catch { console.log("→ Please enter your email in the browser."); }
    } else {
      console.log("→ Please enter your HEB email in the browser.");
    }
    console.log("⏳ Waiting for you to complete login (enter OTP code) — up to 4 min...");
    const ok = await page.waitForFunction(() => {
      const t = document.body.innerText || "";
      return !/log in|sign in/i.test(t) || /my list|saved list|favorites|welcome/i.test(t);
    }, { timeout: 240000 }).then(() => true).catch(() => false);
    if (!ok) { console.log("⚠️ Login not completed. Re-run once you're in."); await browser.close(); process.exit(1); }
    console.log("✅ Logged in.");
  } else {
    console.log("✅ Already logged in (persistent session).");
  }

  // ---- 2. Try the saved "Kynda" list first ----
  const results = { added: [], notFound: [], review: [] };

  async function addProduct(product, qty) {
    try {
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(product)}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2200);
      const addBtn = page.locator("button:has-text('Add'), [data-testid*='add'], button[class*='add']").first();
      if (await addBtn.count()) {
        const qtyInput = page.locator("input[type='number'], input[aria-label*='uantity']").first();
        if (await qtyInput.count()) { await qtyInput.fill(String(qty)); }
        await addBtn.click();
        await page.waitForTimeout(900);
        results.added.push({ product, qty });
      } else {
        results.review.push({ product, qty, note: "no Add button found (name mismatch / out of stock?)" });
      }
    } catch (e) {
      results.review.push({ product, qty, note: `error: ${String(e.message).slice(0, 70)}` });
    }
  }

  for (const item of order) {
    await addProduct(item.product, item.qty);
  }

  // ---- 3. Report ----
  console.log("\n════════ HEB ORDER RESULT ════════");
  console.log(`Added/attempted: ${results.added.length}/${order.length}`);
  for (const a of results.added) console.log(`  ✓ ${a.product} x${a.qty}`);
  console.log(`\nNeed review (${results.review.length}):`);
  for (const r of results.review) console.log(`  ⚠ ${r.product} x${r.qty} — ${r.note}`);

  // Leave the browser open so the human can review the cart.
  console.log("\n👀 Review the cart in the open browser, then check out manually.");
  await browser.close();
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
