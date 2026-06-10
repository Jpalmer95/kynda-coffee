import { describe, expect, it } from "vitest";
import {
  applyRules,
  applyKeywordHeuristics,
  categorizeDeterministic,
  splitCsvLine,
  normalizeDate,
  parseAmountCents,
  parseBankCsv,
  buildPnl,
  type AccountingCategory,
  type CategorizationRule,
} from "./core";

const RULES: CategorizationRule[] = [
  { matcher: "square", category_id: "rev-cafe", priority: 10 },
  { matcher: "stripe", category_id: "rev-online", priority: 10 },
  { matcher: "printful", category_id: "cogs-pod", priority: 10 },
  { matcher: "sq", category_id: "rev-other", priority: 50 }, // lower-priority broader match
];

describe("applyRules", () => {
  it("matches case-insensitive substring on description", () => {
    expect(applyRules({ description: "SQUARE INC DES:240610", amount_cents: 50000 }, RULES)).toBe("rev-cafe");
  });
  it("matches merchant field too", () => {
    expect(applyRules({ description: "payout", merchant: "Stripe", amount_cents: 1 }, RULES)).toBe("rev-online");
  });
  it("lowest priority wins over broader matches", () => {
    // 'SQUARE' contains both 'square' (p10) and 'sq' (p50) → p10 wins
    expect(applyRules({ description: "square payout", amount_cents: 1 }, RULES)).toBe("rev-cafe");
  });
  it("returns null when nothing matches", () => {
    expect(applyRules({ description: "totally unknown vendor", amount_cents: 1 }, RULES)).toBeNull();
  });
});

describe("keyword heuristics + deterministic pass", () => {
  it("falls back to built-in keywords", () => {
    expect(applyKeywordHeuristics({ description: "GUSTO PAYROLL 0610", amount_cents: -1 })).toBe("payroll-wages");
    expect(applyKeywordHeuristics({ description: "WEBSTAURANT cups order", amount_cents: -1 })).toBe("cogs-packaging");
  });
  it("rules win over heuristics; unmatched returns null", () => {
    expect(categorizeDeterministic({ description: "printful order", amount_cents: -1 }, RULES)).toEqual({
      category_id: "cogs-pod",
      suggested_by: "rule",
    });
    expect(categorizeDeterministic({ description: "mystery", amount_cents: -1 }, RULES)).toEqual({
      category_id: null,
      suggested_by: null,
    });
  });
});

describe("CSV primitives", () => {
  it("splitCsvLine handles quoted commas and escaped quotes", () => {
    expect(splitCsvLine('2026-06-01,"COFFEE, INC","He said ""hi""",-12.50')).toEqual([
      "2026-06-01",
      "COFFEE, INC",
      'He said "hi"',
      "-12.50",
    ]);
  });
  it("normalizeDate handles ISO, MM/DD/YYYY, M/D/YY", () => {
    expect(normalizeDate("2026-06-01")).toBe("2026-06-01");
    expect(normalizeDate("06/01/2026")).toBe("2026-06-01");
    expect(normalizeDate("6/1/26")).toBe("2026-06-01");
    expect(normalizeDate("not a date")).toBeNull();
  });
  it("parseAmountCents handles $, commas, parens-negative, minus", () => {
    expect(parseAmountCents("$1,234.56")).toBe(123456);
    expect(parseAmountCents("(45.00)")).toBe(-4500);
    expect(parseAmountCents("-12.30")).toBe(-1230);
    expect(parseAmountCents("abc")).toBeNull();
  });
});

describe("parseBankCsv", () => {
  it("parses a standard date/description/amount export", () => {
    const csv = [
      "Date,Description,Amount",
      "06/01/2026,SQUARE INC PAYOUT,1250.00",
      '06/02/2026,"WEBSTAURANT, LLC",-89.45',
    ].join("\n");
    const res = parseBankCsv(csv);
    expect(res.errors).toEqual([]);
    expect(res.txns).toHaveLength(2);
    expect(res.txns[0]).toMatchObject({ posted_at: "2026-06-01", amount_cents: 125000 });
    expect(res.txns[1]).toMatchObject({ amount_cents: -8945, description: "WEBSTAURANT, LLC" });
  });

  it("parses debit/credit column pairs", () => {
    const csv = [
      "Posted Date,Memo,Debit,Credit",
      "2026-06-03,Rent payment,1800.00,",
      "2026-06-04,Stripe payout,,432.10",
    ].join("\n");
    const res = parseBankCsv(csv);
    expect(res.txns).toHaveLength(2);
    expect(res.txns[0].amount_cents).toBe(-180000);
    expect(res.txns[1].amount_cents).toBe(43210);
  });

  it("collects row errors without failing the whole file", () => {
    const csv = ["Date,Description,Amount", "garbage,,not-money", "06/05/2026,Valid,10.00"].join("\n");
    const res = parseBankCsv(csv);
    expect(res.txns).toHaveLength(1);
    expect(res.errors).toHaveLength(1);
  });

  it("fails clearly when columns are undetectable", () => {
    const res = parseBankCsv("foo,bar\n1,2");
    expect(res.txns).toHaveLength(0);
    expect(res.errors[0]).toContain("Could not detect columns");
  });
});

describe("buildPnl", () => {
  const CATS: AccountingCategory[] = [
    { id: "rev-cafe", label: "Café Sales", kind: "revenue", sort_order: 10 },
    { id: "cogs-coffee", label: "Coffee Beans", kind: "cogs", sort_order: 20 },
    { id: "opex-rent", label: "Rent", kind: "opex", sort_order: 30 },
    { id: "payroll-wages", label: "Wages", kind: "payroll", sort_order: 40 },
    { id: "transfer", label: "Transfers", kind: "transfer", sort_order: 60 },
    { id: "uncategorized", label: "Uncategorized", kind: "other", sort_order: 99 },
  ];

  it("computes revenue, gross, net and margins", () => {
    const pnl = buildPnl(
      [
        { amount_cents: 1000000, category_id: "rev-cafe", category_state: "confirmed" },
        { amount_cents: -300000, category_id: "cogs-coffee", category_state: "confirmed" },
        { amount_cents: -200000, category_id: "opex-rent", category_state: "confirmed" },
        { amount_cents: -250000, category_id: "payroll-wages", category_state: "suggested" },
      ],
      CATS,
      { from: "2026-06-01", to: "2026-06-30" }
    );
    expect(pnl.revenue_cents).toBe(1000000);
    expect(pnl.gross_profit_cents).toBe(700000);
    expect(pnl.net_profit_cents).toBe(250000);
    expect(pnl.gross_margin_pct).toBe(70);
    expect(pnl.net_margin_pct).toBe(25);
  });

  it("excludes transfers and surfaces uncategorized separately", () => {
    const pnl = buildPnl(
      [
        { amount_cents: 50000, category_id: "rev-cafe", category_state: "confirmed" },
        { amount_cents: -99999, category_id: "transfer", category_state: "confirmed" },
        { amount_cents: -1234, category_id: null, category_state: "uncategorized" },
      ],
      CATS,
      { from: "2026-06-01", to: "2026-06-30" }
    );
    expect(pnl.revenue_cents).toBe(50000);
    expect(pnl.net_profit_cents).toBe(50000); // transfer excluded
    expect(pnl.uncategorized_count).toBe(1);
    expect(pnl.uncategorized_cents).toBe(-1234);
  });

  it("handles zero revenue without dividing by zero", () => {
    const pnl = buildPnl(
      [{ amount_cents: -5000, category_id: "opex-rent", category_state: "confirmed" }],
      CATS,
      { from: "2026-06-01", to: "2026-06-30" }
    );
    expect(pnl.gross_margin_pct).toBeNull();
    expect(pnl.net_profit_cents).toBe(-5000);
  });
});
