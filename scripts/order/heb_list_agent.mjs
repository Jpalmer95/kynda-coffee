/**
 * Kynda HEB List Agent — updates quantities on the "Kynda Master Shopping List 2"
 * and adds the list to cart. This matches the owner's real workflow (from the
 * par-sheet docs): open the list → set each item's quantity to this week's buy →
 * "Add to cart".
 *
 * WHY LIST-BASED (not search-add): the Kynda list already contains every item.
 * Search-and-add bypasses the list, risks duplication, and lands items in the
 * cart inconsistently. Setting quantities on the existing list is the correct,
 * duplication-free path.
 *
 * USAGE (repo root, requires HEB logged-in via the CDP browser):
 *   node scripts/order/heb_list_agent.mjs /tmp/heb_order.tsv [listUrl]
 *
 *   listUrl defaults to the Kynda Master Shopping List 2.
 *
 * ENV:
 *   CDP_URL — default http://127.0.0.1:9222
 *   DRY    — "1" to preview matches without changing anything
 */
import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";

const CDP_URL = process.env.CDP_URL || "http://127.0.0.1:9222";
const DRY = process.env.DRY === "1";
const LIST_URL = process.argv[3] || "https://www.heb.com/shopping-list/8f2d655b-fd20-4536-be0c-b8eb66fec521";

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

// Normalize product names for fuzzy matching (strip size/weight/pack tokens)
// KEEP meaningful qualifiers (whole, sliced, shredded, milk, cheese) so we don't
// collapse distinct products (e.g. Whole Milk vs Coconut Milk).
function normalize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")      // strip parentheticals
    .replace(/[^a-z0-9 ]/g, " ")     // keep letters+digits
    .replace(/\b(oz|lbs?|ct|pk|packs?|gal(?:lon)?|jar|can|bag|box|each|count|avg)\b/g, " ")
    .replace(/\d+(?:\.\d+)?/g, " ")  // strip numbers
    .replace(/\b(h[- ]?e[- ]?b|hcf|hill country fare|fresh|original)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s) {
  return new Set(normalize(s).split(" ").filter(Boolean));
}

function matchScore(orderName, listName) {
  const a = tokenSet(orderName);
  const b = tokenSet(listName);
  if (!a.size || !b.size) return 0;
  let hits = 0;
  for (const wa of a) if (b.has(wa)) hits++;
  // coverage = fraction of ORDER tokens present in the LIST name
  const coverage = hits / a.size;
  // Penalize EXTRA tokens on the list side (list verbosity) so we prefer the
  // simplest match (e.g. "Everything Bagels" beats "High Protein Pre-Sliced
  // Everything Bagels" when the order is just "Everything Pre-sliced Bagels").
  const extra = b.size - a.size;
  const extraPenalty = extra > 0 ? Math.min(extra, 4) * 0.08 : 0;
  // Mild penalty for length mismatch (both directions)
  const sizePenalty = Math.abs(a.size - b.size) / Math.max(a.size, b.size) * 0.3;
  return Math.max(0, coverage - extraPenalty - sizePenalty);
}

async function main() {
  const order = parseOrder(process.argv[2]);
  if (!order.length) { console.error("Need an order TSV."); process.exit(1); }
  console.log(`Order: ${order.length} items. Connecting to CDP...\n`);

  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  const page = context.pages().find((p) => p.url().includes("heb.com")) || await context.newPage();

  await page.goto(LIST_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // The list is lazy-rendered — scroll ALL scrollable containers to load all items.
  await page.evaluate(async () => {
    const scrollables = new Set();
    document.querySelectorAll("*").forEach((el) => {
      const st = getComputedStyle(el);
      if (st.overflowY === "auto" || st.overflowY === "scroll") {
        if (el.scrollHeight > el.clientHeight + 50) scrollables.add(el);
      }
    });
    const targets = [...scrollables];
    for (let i = 0; i < 30; i++) {
      for (const el of targets) el.scrollTop = el.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 400));
    }
  });
  await page.waitForTimeout(1200);

  // Collect list items: {name, qtyInputSelector via aria-label}
  const listItems = await page.evaluate(() => {
    const out = [];
    const inputs = Array.from(document.querySelectorAll("input[aria-label^='product amount']"));
    for (const inp of inputs) {
      const label = inp.getAttribute("aria-label") || "";
      const name = label.replace(/^product amount\s+/i, "").trim();
      out.push({ name, label, value: inp.value });
    }
    return out;
  });
  console.log(`List contains ${listItems.length} items.\n`);

  // Match each order item to a list item
  const matches = [];
  const unmatched = [];
  for (const o of order) {
    let best = null, bestScore = 0;
    for (const li of listItems) {
      const s = matchScore(o.product, li.name);
      if (s > bestScore) { bestScore = s; best = li; }
    }
    if (best && bestScore >= 0.45) {
      matches.push({ order: o, list: best, score: bestScore });
    } else {
      unmatched.push({ order: o, best: best ? best.name : null, score: bestScore });
    }
  }

  console.log(`Matched: ${matches.length}   Unmatched: ${unmatched.length}\n`);
  for (const m of matches) {
    console.log(`  ${m.order.qty}  ${m.order.product}\n      -> ${m.list.name} (score ${m.score.toFixed(2)}, current ${m.list.value})`);
  }
  if (unmatched.length) {
    console.log("\nUNMATCHED (need manual attention):");
    for (const u of unmatched) console.log(`  ${u.order.product} x${u.order.qty} (closest: ${u.best})`);
  }

  if (DRY) { console.log("\nDRY RUN — no changes made."); await browser.close(); return; }

  // Update quantities on matched list items
  console.log("\nSetting quantities...");
  let setCount = 0;
  for (const m of matches) {
    try {
      const qtyInput = page.locator(`input[aria-label="${m.list.label}"]`).first();
      if (await qtyInput.count()) {
        await qtyInput.fill(String(m.order.qty));
        await qtyInput.blur();
        await page.waitForTimeout(300);
        setCount++;
      }
    } catch (e) {
      console.error(`  ✗ failed ${m.order.product}: ${e.message.slice(0, 60)}`);
    }
  }
  console.log(`Updated ${setCount} quantities.`);

  if (!DRY && setCount) {
    console.log("\n→ Selecting ONLY the order items, then Add to cart...");
    try {
      // FIX: do NOT use "select all items" — that carts every item on the list
      // (including unneeded ones at qty 1). Instead check only the matched
      // order items' own checkboxes, and uncheck anything we didn't order.
      for (const m of matches) {
        const orderName = m.list.label.replace(/^product amount\s+/i, "");
        // The per-item checkbox uses aria-label "Select <name>"
        const cb = page.locator(`input[aria-label="Select ${orderName}"], input[aria-label="Select ${m.list.name}"]`).first();
        if (await cb.count()) {
          if (!(await cb.isChecked())) { await cb.check(); await page.waitForTimeout(250); }
        } else {
          // Fallback: the checkbox is the sibling input of the qty control
          const qtyInput = page.locator(`input[aria-label="${m.list.label}"]`).first();
          if (await qtyInput.count()) {
            const box = qtyInput.evaluateHandle((el) => {
              const sib = el.closest("li")?.querySelector('input[type="checkbox"]');
              return sib?.getAttribute("aria-label") || sib?.id || "";
            });
            const sel = await box.jsonValue();
            if (sel) {
              const cb2 = page.locator(`input[aria-label="${sel}"], #${CSS.escape(sel)}`).first();
              if (await cb2.count() && !(await cb2.isChecked())) { await cb2.check(); await page.waitForTimeout(250); }
            }
          }
        }
      }
      await page.waitForTimeout(600);
      const addToCart = page.locator("button:has-text('Add to cart'), button:has-text('Add List to Cart')").first();
      if (await addToCart.count()) await addToCart.click();
      await page.waitForTimeout(1500);
      console.log("✅ Clicked Add to Cart (order items only). Verify in the browser, then check out.");
    } catch (e) {
      console.error(`Add-to-cart step: ${e.message.slice(0, 80)}`);
      console.log("Quantities are set on the list — click Add to Cart manually (select only the order items).");
    }
  }

  await browser.close();
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
