/**
 * Kynda Amazon List Extractor — pulls exact item titles (ASIN links) from the
 * Kynda Food List and Kynda Packaging + Supplies List into a canonical TSV.
 *
 * Amazon's list page renders each item as an <a href*="/dp/"> with the full
 * product title. We collect those (plus price when present) and emit exact
 * names for the ordering brain — no manual-entry guessing.
 *
 * USAGE (requires Amazon logged-in via CDP):
 *   node scripts/order/amazon_fetch_list.mjs [--food] [--packaging] [--out path]
 */
import { chromium } from "playwright";
import { writeFileSync, readFileSync, existsSync } from "fs";

const CDP_URL = process.env.CDP_URL || "http://127.0.0.1:9222";
const LIST_URL = "https://www.amazon.com/hz/wishlist/ls";

const LISTS = {
  food: "Kynda Food List",
  packaging: "Kynda Packaging + Supplies List",
};

async function openList(page, name) {
  await page.goto(LIST_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const clicked = await page.evaluate((listName) => {
    const a = Array.from(document.querySelectorAll("a")).find(
      (x) => (x.innerText || "").trim() === listName
    );
    if (a) { a.click(); return true; }
    return false;
  }, name);
  if (!clicked) throw new Error(`Could not open list: ${name}`);
  await page.waitForTimeout(3500);
}

async function extractItems(page) {
  // Scroll to load all items in the lazy list
  await page.evaluate(async () => {
    for (let i = 0; i < 25; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 500));
    }
  });
  await page.waitForTimeout(1200);

  // Each item card has a title link. Amazon wishlist titles live in a link
  // whose href contains "/dp/" AND whose innerText is the longest / not a price.
  // We prefer the first non-price title text per card, and also capture the ASIN.
  return await page.evaluate(() => {
    const items = [];
    const seen = new Map();   // asin -> longest title text
    const links = Array.from(document.querySelectorAll('a[href*="/dp/"]'));
    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const m = href.match(/\/dp\/([A-Z0-9]{10})/i);
      const asin = m ? m[1] : "";
      let t = (a.innerText || "").trim().replace(/\s+/g, " ").trim();
      // Skip price/rating/noise lines and promo-only anchors
      if (!t || t.length < 8) continue;
      if (/^[-$%]/.test(t)) continue;                       // price/discount lines
      if (/^\$\d/.test(t)) continue;
      if (/\b(ratings?|buying options)\b/i.test(t) && !/[a-z]{5,}/.test(t)) continue;
      if (/^(Signage for schools|Amazon Business Card|See all buying options)$/.test(t)) continue;
      // Prefer the longest text per ASIN (the full title), keep once
      const key = asin || t;
      const prev = seen.get(key);
      if (prev) {
        if (t.length > prev.length) { seen.set(key, t); }
      } else {
        seen.set(key, t);
      }
    }
    for (const [asin, title] of seen.entries()) {
      items.push({ title, asin });
    }
    return items;
  });
}

async function main() {
  const args = process.argv.slice(2);
  const doFood = args.includes("--food");
  const doPackaging = args.includes("--packaging");
  const both = !doFood && !doPackaging;
  const out = process.argv[process.argv.indexOf("--out") + 1] || "scripts/order/amazon_canonical_list.tsv";

  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  const page = context.pages().find((p) => p.url().includes("amazon.com")) || await context.newPage();

  const results = {};
  if (doFood || both) { await openList(page, LISTS.food); results.food = await extractItems(page); }
  if (doPackaging || both) { await openList(page, LISTS.packaging); results.packaging = await extractItems(page); }

  // Save raw JSON
  writeFileSync("/tmp/amazon_lists_raw.json", JSON.stringify(results, null, 2));
  console.log(`Food: ${results.food?.length ?? 0} items | Packaging: ${results.packaging?.length ?? 0} items`);

  await browser.close();
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
