/**
 * Kynda HEB Order Agent — the "Hands" (CDP-connected, two-step).
 *
 * Connects to the ALREADY-RUNNING automation browser (Brave CDP on :9222) so it
 * reuses the persistent profile + any saved HEB login. Two independent steps so
 * a human can log in at their own pace, then the cart-fill runs separately.
 *
 * WHY CDP-connect (not launch a new browser): the persistent Brave profile at
 * ~/.hermes/chrome-debug keeps the HEB session alive. Launching a second browser
 * on the same profile would conflict. The login (OTP code) happens in the
 * visible browser; the agent waits, then does the cart-fill on a later step.
 *
 * USAGE (repo root):
 *   node scripts/order/heb_order_agent.mjs --login              # step 1: open login, wait
 *   node scripts/order/heb_order_agent.mjs --fill <order.tsv>   # step 2: fill cart (assumes logged in)
 *   node scripts/order/heb_order_agent.mjs <order.tsv>          # auto: login if needed, then fill
 *
 * ENV:
 *   CDP_URL   — default http://127.0.0.1:9222
 *   LOGIN_MIN — how long (min) to wait for the human to log in, default 15
 *   HEB_EMAIL — optional, pre-fills the login email field (never committed)
 */
import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";

const CDP_URL = process.env.CDP_URL || "http://127.0.0.1:9222";
const LOGIN_MS = (parseInt(process.env.LOGIN_MIN || "15", 10)) * 60 * 1000;

const arg = process.argv[2] || "";
const MODE = arg === "--login" ? "login" : arg === "--fill" ? "fill" : "auto";
const TSV = MODE === "fill" ? process.argv[3] : arg !== "--login" ? process.argv[2] : null;

function parseOrder(path) {
  if (!path || !existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && !/^product\b/i.test(l))
    .map((l) => {
      const [product, qty] = l.split("\t");
      return { product: product.trim(), qty: parseInt(qty?.trim(), 10) || 0 };
    })
    .filter((o) => o.qty > 0);
}

async function isLoggedIn(page) {
  try {
    await page.goto("https://www.heb.com/my-account/lists", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    const t = await page.evaluate(() => document.body.innerText || "");
    // Logged-in lists page has actual list content; login page has "log in"
    return !/log in|sign in/i.test(t) || /my list|saved list|favorites/i.test(t);
  } catch { return false; }
}

async function doLogin(page) {
  console.log("→ Opening HEB login in the browser window...");
  await page.goto("https://www.heb.com/my-account/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  if (process.env.HEB_EMAIL) {
    try { await page.fill("#email-input", process.env.HEB_EMAIL); console.log("→ Email pre-filled."); }
    catch { console.log("→ Please enter your HEB email in the browser."); }
  } else {
    console.log("→ Please enter your HEB email in the browser.");
  }
  console.log(`⏳ Waiting up to ${Math.round(LOGIN_MS/60000)} min for you to log in (enter the OTP code)...`);
  const ok = await page.waitForFunction(() => {
    const t = document.body.innerText || "";
    return !/log in|sign in/i.test(t) || /my list|saved list|favorites|welcome/i.test(t);
  }, { timeout: LOGIN_MS }).then(() => true).catch(() => false);
  if (ok) { console.log("✅ Logged in. Session is saved — you can run --fill anytime."); }
  else { console.log("⚠️ Login not detected in time. Re-run --login when ready (browser stays open)."); }
  return ok;
}

async function fillCart(browser, page, order) {
  const results = { added: [], review: [] };
  for (const item of order) {
    try {
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.product)}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2200);
      const addBtn = page.locator("button:has-text('Add'), [data-testid*='add'], button[class*='add']").first();
      if (await addBtn.count()) {
        const qtyInput = page.locator("input[type='number'], input[aria-label*='uantity']").first();
        if (await qtyInput.count()) { await qtyInput.fill(String(item.qty)); }
        await addBtn.click();
        await page.waitForTimeout(900);
        results.added.push(item);
      } else {
        results.review.push({ ...item, note: "no Add button (name mismatch / OOS?)" });
      }
    } catch (e) {
      results.review.push({ ...item, note: `error: ${String(e.message).slice(0, 70)}` });
    }
  }
  console.log("\n════════ HEB ORDER RESULT ════════");
  console.log(`Added/attempted: ${results.added.length}/${order.length}`);
  for (const a of results.added) console.log(`  ✓ ${a.product} x${a.qty}`);
  console.log(`\nNeed review (${results.review.length}):`);
  for (const r of results.review) console.log(`  ⚠ ${r.product} x${r.qty} — ${r.note}`);
  console.log("\n👀 Review the cart in the open browser, then check out manually.");
}

async function main() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  const page = context.pages().find((p) => p.url().includes("heb.com")) || await context.newPage();

  if (MODE === "login") {
    const ok = await doLogin(page);
    await browser.close();
    process.exit(ok ? 0 : 1);
  }

  // fill or auto
  const order = parseOrder(TSV);
  if (order.length === 0) { console.error("No order items (need <order.tsv> for --fill/auto)."); await browser.close(); process.exit(1); }
  console.log(`Loaded ${order.length} order items.`);

  if (MODE === "fill") {
    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      console.log("⚠️ Not logged in. Run `--login` first (you'll enter the OTP code), then re-run --fill.");
      await browser.close(); process.exit(1);
    }
    await fillCart(browser, page, order);
    await browser.close();
    return;
  }

  // auto
  const loggedIn = await isLoggedIn(page);
  if (loggedIn) {
    console.log("✅ Already logged in.");
  } else {
    const ok = await doLogin(page);
    if (!ok) { await browser.close(); process.exit(1); }
  }
  await fillCart(browser, page, order);
  await browser.close();
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
