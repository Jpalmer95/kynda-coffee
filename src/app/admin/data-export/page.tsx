"use client";

// /admin/data-export — Own your data. Download any table as CSV, or the full
// business as one JSON bundle (portable off this stack).

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download, Database, Loader2 } from "lucide-react";

const ENTITIES: { key: string; label: string; note?: string }[] = [
  { key: "orders", label: "Orders", note: "All orders incl. items, totals, fulfillment" },
  { key: "customers", label: "Customers", note: "Loyalty, spend, referral codes" },
  { key: "products", label: "Products / Catalog" },
  { key: "specials", label: "Monthly Specials" },
  { key: "social_posts", label: "Social Posts" },
  { key: "newsletters", label: "Newsletters" },
  { key: "newsletter_subscribers", label: "Newsletter Subscribers" },
  { key: "contact_submissions", label: "Contact Messages" },
  { key: "b2b_leads", label: "B2B Leads" },
  { key: "b2b_accounts", label: "B2B Accounts" },
  { key: "b2b_orders", label: "B2B Orders" },
  { key: "loyalty_transactions", label: "Loyalty Transactions" },
];

export default function DataExportPage() {
  const [busy, setBusy] = useState<string | null>(null);

  function download(entity: string, format: "csv" | "json") {
    setBusy(`${entity}:${format}`);
    // Navigating to the endpoint triggers the attachment download.
    const url = `/api/admin/export?entity=${encodeURIComponent(entity)}&format=${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => setBusy(null), 1200);
  }

  return (
    <div className="container-max py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="rounded-lg p-2 text-mocha hover:bg-latte/10" aria-label="Back to admin">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-espresso">
            <Database className="h-7 w-7 text-forest" /> Data Export
          </h1>
          <p className="text-sm text-mocha">Your business, your data. Download anything as CSV, or the whole thing as one portable JSON bundle.</p>
        </div>
      </div>

      {/* Full bundle */}
      <div className="mb-8 rounded-2xl border border-forest/30 bg-forest/5 p-6">
        <h2 className="font-heading text-xl font-bold text-espresso">Full business export</h2>
        <p className="mt-1 text-sm text-mocha">Every table in one JSON file — for backups or migrating off this stack entirely. This is what &ldquo;you own your data&rdquo; means.</p>
        <button
          onClick={() => download("all", "json")}
          disabled={busy === "all:json"}
          className="btn-primary mt-4 text-sm disabled:opacity-60"
        >
          {busy === "all:json" ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <Download className="mr-1.5 inline h-4 w-4" />}
          Download everything (.json)
        </button>
      </div>

      {/* Per-entity */}
      <div className="space-y-3">
        {ENTITIES.map((e) => (
          <div key={e.key} className="flex items-center gap-4 rounded-2xl border border-latte/20 bg-card p-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-lg font-semibold text-espresso">{e.label}</h3>
              {e.note && <p className="text-xs text-mocha">{e.note}</p>}
            </div>
            <button onClick={() => download(e.key, "csv")} disabled={busy === `${e.key}:csv`} className="btn-primary text-sm disabled:opacity-60">
              {busy === `${e.key}:csv` ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <Download className="mr-1.5 inline h-4 w-4" />}
              CSV
            </button>
            <button onClick={() => download(e.key, "json")} disabled={busy === `${e.key}:json`} className="btn-secondary text-sm disabled:opacity-60">
              JSON
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
