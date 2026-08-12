/**
 * Kynda HEB List Fetcher — pulls the exact item names + current quantities
 * from the live "Kynda Master Shopping List 2" and writes a canonical TSV.
 *
 * This keeps heb_canonical_list.tsv in sync with the real HEB list, so the
 * order calculator and browser agent always match exact HEB names.
 *
 * USAGE (requires HEB logged-in via CDP browser):
 *   node scripts/order/heb_fetch_list.mjs [--out scripts/order/heb_canonical_list.tsv]
 *
 * Output format: HEB exact name | current_qty | vendor(HEB) | category
 * (par column is merged separately — this fetch updates names/qty only.)
 */
import { chromium } from "playwright";
import { writeFileSync, readFileSync, existsSync } from "fs";

const CDP_URL = process.env.CDP_URL || "http://127.0.0.1:9222";
const LIST_URL = process.env.LIST_URL || "https://www.heb.com/shopping-list/8f2d655b-fd20-4536-be0c-b8eb66fec521";
const OUT = process.argv[2] || "scripts/order/heb_canonical_list.tsv";

async function main() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  const page = context.pages().find((p) => p.url().includes("heb.com")) || await context.newPage();

  await page.goto(LIST_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Load all lazy-rendered items
  await page.evaluate(async () => {
    for (let i = 0; i < 30; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      document.querySelectorAll("*").forEach((el) => {
        if (el.scrollHeight > el.clientHeight + 30) el.scrollTop = el.scrollHeight;
      });
      await new Promise((r) => setTimeout(r, 400));
    }
  });
  await page.waitForTimeout(1200);

  const items = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input[aria-label^='product amount']")).map((i) => {
      const name = (i.getAttribute("aria-label") || "").replace(/^product amount\s+/i, "").trim();
      return { name, qty: i.value };
    })
  );

  console.log(`Fetched ${items.length} items from HEB list.`);

  // Merge with existing par values from the current canonical file (if any)
  const existing = {};
  if (existsSync(OUT)) {
    for (const line of readFileSync(OUT, "utf-8").split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const parts = line.split("|");
      if (parts.length >= 2) existing[parts[0].trim()] = parts;
    }
  }

  const lines = [];
  lines.push("# Kynda HEB — CANONICAL Agent Ordering List (exact HEB names)");
  lines.push("# Auto-refreshed from the live Kynda Master Shopping List 2.");
  lines.push("# Format: HEB exact name | par | vendor | category");
  for (const it of items) {
    const prev = existing[it.name];
    const par = prev ? prev[1] : "";
    const vendor = prev ? prev[2] : "HEB";
    const cat = prev ? prev[3] : "";
    lines.push(`${it.name}|${par}|${vendor}|${cat}`);
  }
  writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(`Wrote ${lines.length - 3} items to ${OUT}`);

  await browser.close();
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
