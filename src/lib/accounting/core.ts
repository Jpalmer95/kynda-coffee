/**
 * Smart Accounting — pure logic (Epic: smart accounting foundation).
 *
 * Deterministic-first categorization (owner rules → keyword heuristics → AI is
 * layered elsewhere and only ever *suggests*), CSV bank-feed parsing, and the
 * P&L rollup. Pure + unit-tested; no I/O here.
 */

export type CategoryKind =
  | "revenue"
  | "cogs"
  | "opex"
  | "payroll"
  | "tax"
  | "transfer"
  | "other";

export interface AccountingCategory {
  id: string;
  label: string;
  kind: CategoryKind;
  sort_order: number;
}

export interface CategorizationRule {
  matcher: string;
  category_id: string;
  priority: number;
}

export interface TxnLike {
  description: string;
  merchant?: string | null;
  amount_cents: number;
}

/**
 * Apply deterministic rules: case-insensitive substring on description+merchant,
 * lowest priority wins. Returns the category id or null when nothing matches.
 */
export function applyRules(txn: TxnLike, rules: CategorizationRule[]): string | null {
  const hay = `${txn.description} ${txn.merchant ?? ""}`.toLowerCase();
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    const needle = rule.matcher.trim().toLowerCase();
    if (needle && hay.includes(needle)) return rule.category_id;
  }
  return null;
}

/** Built-in keyword fallbacks when no owner rule matches (still deterministic). */
const KEYWORD_HEURISTICS: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["payroll", "gusto", "adp ", "paychex"], category: "payroll-wages" },
  { keywords: ["irs", "tax payment", "comptroller", "franchise tax"], category: "tax-sales" },
  { keywords: ["rent", "lease", "landlord"], category: "opex-rent" },
  { keywords: ["electric", "water util", "utility", "internet", "spectrum", "at&t"], category: "opex-rent" },
  { keywords: ["facebook ads", "meta ads", "google ads", "instagram ad"], category: "opex-marketing" },
  { keywords: ["insurance"], category: "opex-insurance" },
  { keywords: ["roast", "coffee bean", "green coffee"], category: "cogs-coffee" },
  { keywords: ["dairy", "milk", "oat ", "oatly"], category: "cogs-dairy" },
  { keywords: ["sysco", "us foods", "restaurant depot", "bakery supply"], category: "cogs-food" },
  { keywords: ["cup", "lid", "packaging", "webstaurant"], category: "cogs-packaging" },
  { keywords: ["interchange", "processing fee", "merchant fee"], category: "opex-fees" },
];

export function applyKeywordHeuristics(txn: TxnLike): string | null {
  const hay = `${txn.description} ${txn.merchant ?? ""}`.toLowerCase();
  for (const h of KEYWORD_HEURISTICS) {
    if (h.keywords.some((k) => hay.includes(k))) return h.category;
  }
  return null;
}

export interface CategorizationOutcome {
  category_id: string | null;
  suggested_by: "rule" | null;
}

/** Full deterministic pass: owner rules first, then built-in heuristics. */
export function categorizeDeterministic(
  txn: TxnLike,
  rules: CategorizationRule[]
): CategorizationOutcome {
  const byRule = applyRules(txn, rules) ?? applyKeywordHeuristics(txn);
  return byRule ? { category_id: byRule, suggested_by: "rule" } : { category_id: null, suggested_by: null };
}

// ─────────────────────────── CSV bank-feed parsing ───────────────────────────

export interface ParsedTxn {
  posted_at: string; // YYYY-MM-DD
  amount_cents: number;
  description: string;
  external_id?: string;
}

export interface CsvParseResult {
  txns: ParsedTxn[];
  errors: string[];
  skipped: number;
}

/** RFC-4180-ish CSV line splitter handling quoted fields with commas. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Normalize many bank date formats to YYYY-MM-DD; null when unparseable. */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  // ISO already
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // MM/DD/YYYY or M/D/YY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    const mm = m[1].padStart(2, "0");
    const dd = m[2].padStart(2, "0");
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
      return `${year}-${mm}-${dd}`;
    }
  }
  return null;
}

/** Parse a money string like "$1,234.56", "(45.00)" (negative), "-12.30". */
export function parseAmountCents(raw: string): number | null {
  let s = raw.trim().replace(/[$,]/g, "");
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return negative ? -cents : cents;
}

/**
 * Parse a bank CSV export. Auto-detects columns by header name:
 * date (date/posted), description (description/memo/payee/name),
 * amount (amount) OR debit+credit pair. Rows that fail to parse are
 * collected as errors, not fatal.
 */
export function parseBankCsv(content: string): CsvParseResult {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { txns: [], errors: ["CSV needs a header row and at least one transaction."], skipped: 0 };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const findCol = (...names: string[]) =>
    header.findIndex((h) => names.some((n) => h.includes(n)));

  const dateCol = findCol("date", "posted");
  const descCol = findCol("description", "memo", "payee", "name", "detail");
  const amountCol = findCol("amount");
  const debitCol = findCol("debit", "withdrawal");
  const creditCol = findCol("credit", "deposit");
  const idCol = findCol("id", "reference", "ref ");

  if (dateCol === -1 || descCol === -1 || (amountCol === -1 && (debitCol === -1 || creditCol === -1))) {
    return {
      txns: [],
      errors: [
        `Could not detect columns. Found headers: ${header.join(", ")}. Need a date, a description, and either an amount column or debit+credit columns.`,
      ],
      skipped: 0,
    };
  }

  const txns: ParsedTxn[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const date = normalizeDate(cells[dateCol] ?? "");
    const description = (cells[descCol] ?? "").slice(0, 300);
    let amount: number | null = null;

    if (amountCol !== -1) {
      amount = parseAmountCents(cells[amountCol] ?? "");
    } else {
      const debit = parseAmountCents(cells[debitCol] ?? "");
      const credit = parseAmountCents(cells[creditCol] ?? "");
      if (debit && debit !== 0) amount = -Math.abs(debit);
      else if (credit && credit !== 0) amount = Math.abs(credit);
    }

    if (!date || !description || amount === null) {
      if (cells.join("").trim().length === 0) {
        skipped++;
      } else {
        errors.push(`Row ${i + 1}: could not parse (date='${cells[dateCol] ?? ""}', amount issue).`);
      }
      continue;
    }
    txns.push({
      posted_at: date,
      amount_cents: amount,
      description,
      external_id: idCol !== -1 && cells[idCol] ? `csv:${cells[idCol]}` : undefined,
    });
  }

  return { txns, errors, skipped };
}

// ─────────────────────────────── P&L rollup ───────────────────────────────

export interface PnlLine {
  category_id: string;
  label: string;
  kind: CategoryKind;
  amount_cents: number; // signed: revenue positive, expenses negative
}

export interface PnlStatement {
  from: string;
  to: string;
  revenue_cents: number;
  cogs_cents: number;       // negative
  gross_profit_cents: number;
  opex_cents: number;        // negative (includes payroll + tax for operating view)
  net_profit_cents: number;
  gross_margin_pct: number | null;
  net_margin_pct: number | null;
  lines: PnlLine[];
  uncategorized_count: number;
  uncategorized_cents: number;
}

export interface PnlTxn {
  amount_cents: number;
  category_id: string | null;
  category_state: string;
}

/**
 * Build a P&L from categorized transactions. Transfers are excluded (non-P&L).
 * Uncategorized/unsuggested amounts are surfaced separately so the owner knows
 * how trustworthy the statement is.
 */
export function buildPnl(
  txns: PnlTxn[],
  categories: AccountingCategory[],
  window: { from: string; to: string }
): PnlStatement {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const sums = new Map<string, number>();
  let uncategorizedCount = 0;
  let uncategorizedCents = 0;

  for (const t of txns) {
    const cat = t.category_id ? catById.get(t.category_id) : undefined;
    if (!cat || t.category_state === "uncategorized") {
      uncategorizedCount++;
      uncategorizedCents += t.amount_cents;
      continue;
    }
    if (cat.kind === "transfer") continue; // non-P&L
    sums.set(cat.id, (sums.get(cat.id) ?? 0) + t.amount_cents);
  }

  const lines: PnlLine[] = Array.from(sums.entries())
    .map(([id, amount]) => {
      const c = catById.get(id)!;
      return { category_id: id, label: c.label, kind: c.kind, amount_cents: amount };
    })
    .sort((a, b) => (catById.get(a.category_id)!.sort_order - catById.get(b.category_id)!.sort_order));

  const sumKind = (kind: CategoryKind) =>
    lines.filter((l) => l.kind === kind).reduce((s, l) => s + l.amount_cents, 0);

  const revenue = sumKind("revenue");
  const cogs = sumKind("cogs");
  const opex = sumKind("opex") + sumKind("payroll") + sumKind("tax") + sumKind("other");
  const grossProfit = revenue + cogs; // cogs is negative
  const netProfit = grossProfit + opex; // opex negative

  return {
    from: window.from,
    to: window.to,
    revenue_cents: revenue,
    cogs_cents: cogs,
    gross_profit_cents: grossProfit,
    opex_cents: opex,
    net_profit_cents: netProfit,
    gross_margin_pct: revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(1)) : null,
    net_margin_pct: revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(1)) : null,
    lines,
    uncategorized_count: uncategorizedCount,
    uncategorized_cents: uncategorizedCents,
  };
}
