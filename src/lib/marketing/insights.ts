/**
 * Growth Insights engine (Roadmap V2 — Epic 5, final item).
 *
 * Pure, testable logic that turns raw business signals into prioritized, owner-
 * facing recommendations. No DB/network — the API gathers the data and passes it
 * in; this decides what's worth saying and how urgent it is.
 *
 * Design: each rule inspects the inputs and may emit an Insight. Insights are
 * sorted by severity then impact so the dashboard shows the most actionable first.
 * Every insight is concrete (a number + a suggested action), never vague.
 */

export type InsightSeverity = "critical" | "warning" | "opportunity" | "positive";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  /** Suggested next action the owner can take. */
  action?: string;
  /** Optional deep link into the admin. */
  href?: string;
  /** Relative impact score for ordering within a severity band (higher = first). */
  impact: number;
}

export interface InsightInputs {
  /** revenue_by_day: { "2026-06-01": cents, ... } over ~30d. */
  revenueByDay: Record<string, number>;
  /** Top products by units: [{ name, units, revenue }]. */
  topProducts: Array<{ name: string; units: number; revenue: number }>;
  cafeRevenue30d: number;
  merchRevenue30d: number;
  /** New customers per day over ~30d. */
  customersByDay: Record<string, number>;
  ordersByStatus: Record<string, number>;
  /** Marketing context. */
  liveSpecialsCount: number;
  pendingApprovalCount: number; // social drafts waiting
  activeSubscribers: number;
  lastNewsletterDaysAgo: number | null; // null = never sent
  /** Inventory context (from MenuMetrics bridge). */
  lowStockCount: number;
}

const DAY_MS = 86_400_000;

/** Sum a per-day map for the window [nowMs - days, nowMs). */
function sumWindow(byDay: Record<string, number>, nowMs: number, fromDaysAgo: number, toDaysAgo: number): number {
  let total = 0;
  for (const [day, val] of Object.entries(byDay)) {
    const t = new Date(day + "T00:00:00Z").getTime();
    if (Number.isNaN(t)) continue;
    const ageDays = (nowMs - t) / DAY_MS;
    if (ageDays >= toDaysAgo && ageDays < fromDaysAgo) total += val;
  }
  return total;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return Math.round(((curr - prev) / prev) * 100);
}

/** Generate the prioritized insight list. */
export function generateInsights(input: InsightInputs, nowMs = Date.now()): Insight[] {
  const out: Insight[] = [];

  // ── Revenue trend: this week vs prior week ────────────────────────────────
  const thisWeek = sumWindow(input.revenueByDay, nowMs, 7, 0);
  const priorWeek = sumWindow(input.revenueByDay, nowMs, 14, 7);
  const wow = pctChange(thisWeek, priorWeek);
  if (wow != null) {
    if (wow <= -15) {
      out.push({
        id: "revenue-down",
        severity: "warning",
        title: `Revenue down ${Math.abs(wow)}% week-over-week`,
        detail: `Last 7 days $${(thisWeek / 100).toFixed(0)} vs prior 7 days $${(priorWeek / 100).toFixed(0)}.`,
        action: input.liveSpecialsCount === 0 ? "No live special right now — add one to drive traffic." : "Push the current special harder via a newsletter or social post.",
        href: input.liveSpecialsCount === 0 ? "/admin/specials" : "/admin/marketing/content-drop",
        impact: Math.abs(wow),
      });
    } else if (wow >= 15) {
      out.push({
        id: "revenue-up",
        severity: "positive",
        title: `Revenue up ${wow}% week-over-week`,
        detail: `Last 7 days $${(thisWeek / 100).toFixed(0)} vs prior 7 days $${(priorWeek / 100).toFixed(0)}. Keep the momentum.`,
        action: "Capture what's working — repeat the recent special/post that landed.",
        impact: wow,
      });
    }
  }

  // ── Channel mix: café vs merch ────────────────────────────────────────────
  const totalRev = input.cafeRevenue30d + input.merchRevenue30d;
  if (totalRev > 0) {
    const merchPct = Math.round((input.merchRevenue30d / totalRev) * 100);
    if (merchPct >= 25) {
      out.push({
        id: "merch-strong",
        severity: "opportunity",
        title: `Merch & POD is ${merchPct}% of 30-day revenue`,
        detail: "Shipped goods are pulling real weight — there's room to lean in.",
        action: "Promote the Design Studio and trending merch; consider a featured drop.",
        href: "/admin/marketing/content-drop",
        impact: merchPct,
      });
    }
  }

  // ── Top product concentration ─────────────────────────────────────────────
  if (input.topProducts.length > 0) {
    const totalUnits = input.topProducts.reduce((n, p) => n + p.units, 0);
    const top = input.topProducts[0];
    const share = totalUnits > 0 ? Math.round((top.units / totalUnits) * 100) : 0;
    if (share >= 30) {
      out.push({
        id: "top-product-concentration",
        severity: "opportunity",
        title: `"${top.name}" is ${share}% of units sold`,
        detail: "One item is carrying the menu — great for a signature, risky for breadth.",
        action: "Feature it as a special, and cross-sell a complementary item to widen the basket.",
        href: "/admin/specials",
        impact: share,
      });
    }
  }

  // ── Customer growth ───────────────────────────────────────────────────────
  const newThisWeek = sumWindow(input.customersByDay, nowMs, 7, 0);
  const newPriorWeek = sumWindow(input.customersByDay, nowMs, 14, 7);
  const custWow = pctChange(newThisWeek, newPriorWeek);
  if (custWow != null && custWow <= -25 && newPriorWeek >= 3) {
    out.push({
      id: "acquisition-slowing",
      severity: "warning",
      title: `New-customer sign-ups down ${Math.abs(custWow)}% WoW`,
      detail: `${newThisWeek} new this week vs ${newPriorWeek} prior. Acquisition is cooling.`,
      action: "Run a referral push or a first-order incentive via newsletter.",
      href: "/admin/newsletters",
      impact: Math.abs(custWow),
    });
  }

  // ── Marketing hygiene ─────────────────────────────────────────────────────
  if (input.pendingApprovalCount > 0) {
    out.push({
      id: "drafts-waiting",
      severity: "warning",
      title: `${input.pendingApprovalCount} social draft(s) awaiting approval`,
      detail: "Agent-drafted posts are queued but not live — they age out of relevance fast.",
      action: "Review and approve or reject them.",
      href: "/admin/marketing/approvals",
      impact: 50 + input.pendingApprovalCount,
    });
  }

  if (input.activeSubscribers >= 25) {
    if (input.lastNewsletterDaysAgo == null) {
      out.push({
        id: "newsletter-never",
        severity: "opportunity",
        title: `${input.activeSubscribers} subscribers, no newsletter sent yet`,
        detail: "You have an owned audience that's never heard from you.",
        action: "Generate a newsletter from current specials and send your first.",
        href: "/admin/newsletters",
        impact: 40,
      });
    } else if (input.lastNewsletterDaysAgo >= 35) {
      out.push({
        id: "newsletter-stale",
        severity: "opportunity",
        title: `It's been ${input.lastNewsletterDaysAgo} days since your last newsletter`,
        detail: `${input.activeSubscribers} subscribers are waiting. Monthly cadence keeps you top-of-mind.`,
        action: "Send this month's newsletter.",
        href: "/admin/newsletters",
        impact: 30,
      });
    }
  }

  if (input.liveSpecialsCount === 0) {
    out.push({
      id: "no-special",
      severity: "opportunity",
      title: "No live special right now",
      detail: "Specials anchor the top of the menu and seed marketing — running one lifts both.",
      action: "Create a monthly special.",
      href: "/admin/specials",
      impact: 20,
    });
  }

  // ── Operations ────────────────────────────────────────────────────────────
  const pending = (input.ordersByStatus.pending ?? 0) + (input.ordersByStatus.processing ?? 0);
  if (pending >= 5) {
    out.push({
      id: "orders-backlog",
      severity: "critical",
      title: `${pending} orders pending/processing`,
      detail: "A backlog this size risks pickup delays and unhappy customers.",
      action: "Open the KDS and clear the queue.",
      href: "/admin/kds",
      impact: 90 + pending,
    });
  }

  if (input.lowStockCount > 0) {
    out.push({
      id: "low-stock",
      severity: input.lowStockCount >= 5 ? "critical" : "warning",
      title: `${input.lowStockCount} ingredient(s) low on stock`,
      detail: "Running out mid-service kills sales and trust.",
      action: "Review inventory and reorder.",
      href: "/admin/inventory",
      impact: 80 + input.lowStockCount,
    });
  }

  // ── Sort: severity band, then impact desc ─────────────────────────────────
  const sevRank: Record<InsightSeverity, number> = { critical: 0, warning: 1, opportunity: 2, positive: 3 };
  out.sort((a, b) => {
    if (sevRank[a.severity] !== sevRank[b.severity]) return sevRank[a.severity] - sevRank[b.severity];
    return b.impact - a.impact;
  });

  return out;
}
