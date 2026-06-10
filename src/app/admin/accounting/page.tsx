"use client";

/**
 * /admin/accounting — Smart Accounting (owner only).
 *
 * Foundation per owner ask: clean bank feed (CSV import today, Plaid-ready
 * schema), automated transaction categorization (deterministic rules +
 * heuristics suggest; OWNER confirms — AI never auto-posts), and a live P&L.
 *
 * Tabs: Accounts & Import · Review (categorize) · P&L
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Check,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Plus,
  TrendingUp,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Tab = "accounts" | "review" | "pnl";

interface Account {
  id: string;
  name: string;
  institution: string | null;
  kind: string;
  last4: string | null;
  txn_count: number;
  balance_cents: number;
}

interface Txn {
  id: string;
  posted_at: string;
  amount_cents: number;
  description: string;
  category_id: string | null;
  category_state: string;
  suggested_by: string | null;
}

interface Category {
  id: string;
  label: string;
  kind: string;
  sort_order: number;
}

interface Pnl {
  from: string;
  to: string;
  revenue_cents: number;
  cogs_cents: number;
  gross_profit_cents: number;
  opex_cents: number;
  net_profit_cents: number;
  gross_margin_pct: number | null;
  net_margin_pct: number | null;
  lines: { category_id: string; label: string; kind: string; amount_cents: number }[];
  uncategorized_count: number;
  uncategorized_cents: number;
}

function money(cents: number) {
  const f = formatPrice(Math.abs(cents));
  return cents < 0 ? `(${f})` : f;
}

export default function AdminAccountingPage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [error, setError] = useState<string | null>(null);

  // Accounts
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [newName, setNewName] = useState("");
  const [newInstitution, setNewInstitution] = useState("");
  const [newKind, setNewKind] = useState("checking");
  const [creating, setCreating] = useState(false);

  // Import
  const [importAccount, setImportAccount] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Review
  const [txns, setTxns] = useState<Txn[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviewState, setReviewState] = useState<string>("suggested");
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [busyTxn, setBusyTxn] = useState<string | null>(null);

  // P&L
  const [pnl, setPnl] = useState<Pnl | null>(null);
  const [pnlMonth, setPnlMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loadingPnl, setLoadingPnl] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/admin/accounting/accounts", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts ?? []);
        if (!importAccount && data.accounts?.length) setImportAccount(data.accounts[0].id);
      } else setError(data.error);
    } finally {
      setLoadingAccounts(false);
    }
  }, [importAccount]);

  const loadTxns = useCallback(async () => {
    setLoadingTxns(true);
    try {
      const qs = reviewState === "all" ? "" : `?state=${reviewState}`;
      const res = await fetch(`/api/admin/accounting/transactions${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setTxns(data.transactions ?? []);
        setCategories(data.categories ?? []);
      } else setError(data.error);
    } finally {
      setLoadingTxns(false);
    }
  }, [reviewState]);

  const loadPnl = useCallback(async () => {
    setLoadingPnl(true);
    try {
      const [y, m] = pnlMonth.split("-").map(Number);
      const from = `${pnlMonth}-01`;
      const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); // last day of month
      const res = await fetch(`/api/admin/accounting/pnl?from=${from}&to=${to}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setPnl(data.pnl);
      else setError(data.error);
    } finally {
      setLoadingPnl(false);
    }
  }, [pnlMonth]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);
  useEffect(() => {
    if (tab === "review") loadTxns();
    if (tab === "pnl") loadPnl();
  }, [tab, loadTxns, loadPnl]);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_account", name: newName, institution: newInstitution, kind: newKind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setNewName("");
      setNewInstitution("");
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setCreating(false);
    }
  }

  async function importCsv() {
    if (!importAccount || !csvText.trim()) return;
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_csv", account_id: importAccount, csv: csvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportResult(
        `Imported ${data.imported} transactions (${data.auto_suggested} auto-categorized, ${data.duplicates_skipped} duplicates skipped${data.row_errors?.length ? `, ${data.row_errors.length} row errors` : ""}).`
      );
      setCsvText("");
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function confirmCategory(txnId: string, categoryId: string, learnMatcher?: string) {
    setBusyTxn(txnId);
    try {
      const res = await fetch("/api/admin/accounting/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: txnId,
          category_id: categoryId,
          ...(learnMatcher ? { create_rule: true, matcher: learnMatcher } : {}),
        }),
      });
      if (res.ok) {
        setTxns((prev) => prev.filter((t) => t.id !== txnId || reviewState === "all" || reviewState === "confirmed"));
        await loadTxns();
      }
    } finally {
      setBusyTxn(null);
    }
  }

  const catLabel = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);

  const TABS: { key: Tab; label: string; icon: typeof Landmark }[] = [
    { key: "accounts", label: "Accounts & Import", icon: Landmark },
    { key: "review", label: "Review", icon: Check },
    { key: "pnl", label: "P&L", icon: TrendingUp },
  ];

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 hover:bg-latte/10">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading flex items-center gap-3 text-3xl font-bold">
            <Banknote className="h-8 w-8 text-forest" /> Smart Accounting
          </h1>
          <p className="text-sm text-mocha">
            Bank feed → auto-categorization → P&L. Suggestions are automatic; nothing posts without your confirmation.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-forest text-sand" : "border border-latte/30 text-espresso hover:border-forest/50"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* ─── Accounts & Import ─── */}
      {tab === "accounts" && (
        <div className="space-y-8">
          {loadingAccounts ? (
            <div className="flex items-center justify-center py-10 text-mocha">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading accounts...
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((a) => (
                <div key={a.id} className="rounded-2xl border border-latte/20 bg-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-espresso">{a.name}</div>
                    <span className="rounded-full bg-latte/20 px-2 py-0.5 text-xs capitalize text-mocha">{a.kind.replace("_", " ")}</span>
                  </div>
                  <div className="mt-1 text-xs text-mocha">{a.institution || "—"}{a.last4 ? ` ••${a.last4}` : ""}</div>
                  <div className="mt-3 font-heading text-2xl font-bold text-espresso">{money(a.balance_cents)}</div>
                  <div className="text-xs text-mocha">{a.txn_count} transactions</div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div className="col-span-full rounded-2xl border border-latte/20 bg-card py-10 text-center text-sm text-mocha">
                  No accounts yet — add your business checking below, then import a CSV from your bank.
                </div>
              )}
            </div>
          )}

          {/* New account */}
          <form onSubmit={createAccount} className="rounded-2xl border border-latte/20 bg-card p-5">
            <h2 className="mb-3 font-semibold text-espresso">Add Account</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Name</span>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Business Checking" className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-espresso" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Institution</span>
                <input value={newInstitution} onChange={(e) => setNewInstitution(e.target.value)} placeholder="Chase / Local CU" className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-espresso" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-mocha">Type</span>
                <select value={newKind} onChange={(e) => setNewKind(e.target.value)} className="rounded-lg border border-latte/30 bg-background px-3 py-2 capitalize text-espresso">
                  {["checking", "savings", "credit_card", "payment_processor", "cash", "other"].map((k) => (
                    <option key={k} value={k}>{k.replace("_", " ")}</option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={creating || !newName.trim()} className="flex items-center gap-2 rounded-xl bg-forest px-4 py-2 text-sm font-medium text-sand disabled:opacity-50">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
              </button>
            </div>
          </form>

          {/* CSV import */}
          <div className="rounded-2xl border border-latte/20 bg-card p-5">
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-espresso">
              <FileSpreadsheet className="h-4 w-4 text-forest" /> Import Bank CSV
            </h2>
            <p className="mb-3 text-xs text-mocha">
              Download a CSV from your bank's website and paste it here (columns auto-detected: date, description, amount or debit/credit). Re-importing the same file is safe — duplicates are skipped.
            </p>
            <div className="mb-3">
              <select value={importAccount} onChange={(e) => setImportAccount(e.target.value)} className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso">
                <option value="">Select account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"Date,Description,Amount\n06/01/2026,SQUARE INC PAYOUT,1250.00\n06/02/2026,WEBSTAURANT LLC,-89.45"}
              className="h-40 w-full rounded-xl border border-latte/30 bg-background p-3 font-mono text-xs text-espresso"
            />
            <div className="mt-3 flex items-center gap-3">
              <button onClick={importCsv} disabled={importing || !importAccount || !csvText.trim()} className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2 text-sm font-medium text-sand disabled:opacity-50">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Import
              </button>
              {importResult && <span className="text-sm text-green-700">{importResult}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ─── Review ─── */}
      {tab === "review" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["suggested", "uncategorized", "confirmed", "all"].map((s) => (
              <button
                key={s}
                onClick={() => setReviewState(s)}
                className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${
                  reviewState === s ? "bg-forest text-sand" : "border border-latte/30 text-espresso hover:border-forest/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {loadingTxns ? (
            <div className="flex items-center justify-center py-10 text-mocha">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading transactions...
            </div>
          ) : txns.length === 0 ? (
            <div className="rounded-2xl border border-latte/20 bg-card py-12 text-center text-sm text-mocha">
              Nothing to review here. Import a bank CSV to get started.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-latte/20 bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-latte/20 text-xs uppercase tracking-wide text-mocha">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id} className="border-b border-latte/10 last:border-0">
                      <td className="px-4 py-2.5 whitespace-nowrap text-mocha">{t.posted_at}</td>
                      <td className="max-w-xs truncate px-4 py-2.5 text-espresso" title={t.description}>{t.description}</td>
                      <td className={`px-4 py-2.5 font-mono ${t.amount_cents < 0 ? "text-red-600" : "text-green-700"}`}>
                        {money(t.amount_cents)}
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={t.category_id ?? ""}
                          onChange={(e) =>
                            setTxns((prev) => prev.map((x) => (x.id === t.id ? { ...x, category_id: e.target.value } : x)))
                          }
                          className="rounded-lg border border-latte/30 bg-background px-2 py-1.5 text-xs text-espresso"
                        >
                          <option value="">— pick —</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                        {t.category_state === "suggested" && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            suggested
                          </span>
                        )}
                        {t.category_state === "confirmed" && (
                          <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                            ✓ {catLabel.get(t.category_id ?? "") ?? ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {t.category_state !== "confirmed" && (
                          <button
                            onClick={() => t.category_id && confirmCategory(t.id, t.category_id)}
                            disabled={busyTxn === t.id || !t.category_id}
                            className="flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-medium text-sand disabled:opacity-40"
                          >
                            {busyTxn === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── P&L ─── */}
      {tab === "pnl" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={pnlMonth}
              onChange={(e) => setPnlMonth(e.target.value)}
              className="rounded-lg border border-latte/30 bg-background px-3 py-2 text-sm text-espresso"
            />
            <button onClick={loadPnl} className="rounded-xl border border-latte/30 px-4 py-2 text-sm text-espresso hover:border-forest/50">
              Refresh
            </button>
          </div>

          {loadingPnl ? (
            <div className="flex items-center justify-center py-10 text-mocha">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Building P&L...
            </div>
          ) : pnl ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PnlStat label="Revenue" cents={pnl.revenue_cents} />
                <PnlStat label="Gross Profit" cents={pnl.gross_profit_cents} sub={pnl.gross_margin_pct != null ? `${pnl.gross_margin_pct}% margin` : undefined} />
                <PnlStat label="Operating Costs" cents={pnl.opex_cents} />
                <PnlStat label="Net Profit" cents={pnl.net_profit_cents} sub={pnl.net_margin_pct != null ? `${pnl.net_margin_pct}% margin` : undefined} highlight />
              </div>

              <div className="overflow-hidden rounded-2xl border border-latte/20 bg-card">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-latte/20 text-xs uppercase tracking-wide text-mocha">
                    <tr>
                      <th className="px-4 py-3">Line Item</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnl.lines.map((l) => (
                      <tr key={l.category_id} className="border-b border-latte/10 last:border-0">
                        <td className="px-4 py-2.5 text-espresso">{l.label}</td>
                        <td className="px-4 py-2.5 capitalize text-mocha">{l.kind}</td>
                        <td className={`px-4 py-2.5 text-right font-mono ${l.amount_cents < 0 ? "text-red-600" : "text-green-700"}`}>
                          {money(l.amount_cents)}
                        </td>
                      </tr>
                    ))}
                    {pnl.lines.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-mocha">No categorized transactions in this window yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {pnl.uncategorized_count > 0 && (
                <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  ⚠ {pnl.uncategorized_count} uncategorized transaction{pnl.uncategorized_count === 1 ? "" : "s"} totaling {money(pnl.uncategorized_cents)} are excluded from this P&L —{" "}
                  <button onClick={() => { setTab("review"); setReviewState("uncategorized"); }} className="font-semibold underline">
                    review them
                  </button>{" "}
                  for accurate books.
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PnlStat({ label, cents, sub, highlight }: { label: string; cents: number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-forest/40 bg-forest/5" : "border-latte/20 bg-card"}`}>
      <div className="text-xs uppercase tracking-wide text-mocha">{label}</div>
      <div className={`mt-1 font-heading text-2xl font-bold ${cents < 0 ? "text-red-600" : "text-espresso"}`}>
        {cents < 0 ? `(${formatPrice(Math.abs(cents))})` : formatPrice(cents)}
      </div>
      {sub && <div className="mt-0.5 text-xs text-forest">{sub}</div>}
    </div>
  );
}
