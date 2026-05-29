"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  QrCode,
  Plus,
  Trash2,
  Download,
  Printer,
  Copy,
  Check,
  QrCodeIcon,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface TableEntry {
  id: string;
  number: string;
  label: string;
  location: string; // e.g., "Patio", "Main Floor", "Bar"
}

const STORAGE_KEY = "kynda_qr_tables";
const BASE_URL = "https://kyndacoffee.com";

// ── Helpers ────────────────────────────────────────────────────────────────

function loadTables(): TableEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTables(tables: TableEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
}

function tableUrl(t: TableEntry) {
  return `${BASE_URL}/order?table=${encodeURIComponent(t.number)}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminQrTablesPage() {
  const [tables, setTables] = useState<TableEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  // New table form
  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newLocation, setNewLocation] = useState("Main Floor");

  // QR rendering
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setTables(loadTables());
    setMounted(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (mounted) saveTables(tables);
  }, [tables, mounted]);

  // Generate QR codes when tables change
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    (async () => {
      const QRCode = await import("qrcode");
      const urls: Record<string, string> = {};
      for (const t of tables) {
        try {
          urls[t.id] = await QRCode.toDataURL(tableUrl(t), {
            width: 300,
            margin: 2,
            color: { dark: "#061B0E", light: "#FFFFFF" },
            errorCorrectionLevel: "H",
          });
        } catch {
          // skip
        }
      }
      if (!cancelled) setQrDataUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [tables, mounted]);

  function addTable() {
    const num = newNumber.trim();
    if (!num) return;
    // Prevent duplicates
    if (tables.some((t) => t.number === num)) return;
    const entry: TableEntry = {
      id: crypto.randomUUID(),
      number: num,
      label: newLabel.trim() || `Table ${num}`,
      location: newLocation.trim() || "Main Floor",
    };
    setTables((prev) => [...prev, entry]);
    setNewNumber("");
    setNewLabel("");
  }

  function removeTable(id: string) {
    setTables((prev) => prev.filter((t) => t.id !== id));
  }

  function downloadQr(table: TableEntry) {
    const url = qrDataUrls[table.id];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `kynda-qr-table-${table.number}.png`;
    a.click();
  }

  function downloadAll() {
    for (const t of tables) {
      downloadQr(t);
    }
  }

  function copyUrl(table: TableEntry) {
    navigator.clipboard.writeText(tableUrl(table));
    setCopiedId(table.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function printAll() {
    window.print();
  }

  if (!mounted) return null;

  // Group by location
  const grouped = tables.reduce<Record<string, TableEntry[]>>((acc, t) => {
    const loc = t.location || "Other";
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <QrCode className="h-8 w-8 text-emerald-400" />
          <h1 className="font-heading text-3xl font-bold text-white">
            QR Table Ordering
          </h1>
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          Generate QR codes for each table. Guests scan → order from their phone → staff delivers.
        </p>
      </div>

      {/* Add Table Form */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Add Table</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Table Number *
            </label>
            <input
              type="text"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="e.g. 12"
              className="w-28 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              onKeyDown={(e) => e.key === "Enter" && addTable()}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Label (optional)
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Patio 3"
              className="w-40 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              onKeyDown={(e) => e.key === "Enter" && addTable()}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Location
            </label>
            <select
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-40 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option>Main Floor</option>
              <option>Patio</option>
              <option>Bar</option>
              <option>Upstairs</option>
              <option>Other</option>
            </select>
          </div>
          <button
            onClick={addTable}
            disabled={!newNumber.trim()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Table
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {tables.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={downloadAll}
            className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            <Download className="h-4 w-4" />
            Download All QR Codes
          </button>
          <button
            onClick={printAll}
            className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            <Printer className="h-4 w-4" />
            Print All
          </button>
          <span className="flex items-center text-sm text-zinc-400">
            {tables.length} table{tables.length !== 1 ? "s" : ""} configured
          </span>
        </div>
      )}

      {/* Tables grouped by location */}
      {Object.entries(grouped).map(([location, locTables]) => (
        <div key={location}>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            {location} ({locTables.length})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {locTables.map((table) => (
              <div
                key={table.id}
                className="rounded-xl border border-zinc-700 bg-zinc-800 p-5 transition-colors hover:border-zinc-600"
              >
                {/* QR Image */}
                <div className="mb-4 flex items-center justify-center">
                  {qrDataUrls[table.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrls[table.id]}
                      alt={`QR code for ${table.label}`}
                      className="h-40 w-40 rounded-lg"
                    />
                  ) : (
                    <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-zinc-700">
                      <QrCodeIcon className="h-12 w-12 text-zinc-500" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="text-center">
                  <h4 className="font-heading text-xl font-bold text-white">
                    {table.label}
                  </h4>
                  <p className="mt-1 text-xs text-zinc-500 break-all">
                    {tableUrl(table)}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => downloadQr(table)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    title="Download QR as PNG"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PNG
                  </button>
                  <button
                    onClick={() => copyUrl(table)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    title="Copy order URL"
                  >
                    {copiedId === table.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        URL
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => removeTable(table.id)}
                    className="flex items-center justify-center rounded-lg border border-red-800/50 bg-zinc-900 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-900/30 hover:text-red-300"
                    title="Remove table"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {tables.length === 0 && (
        <div className="py-16 text-center">
          <QrCode className="mx-auto h-16 w-16 text-zinc-600" />
          <p className="mt-4 text-lg text-zinc-400">No tables configured yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Add tables above to generate QR codes for in-store ordering.
          </p>
        </div>
      )}

      {/* Print Styles (hidden on screen, shown in print) */}
      <style jsx>{`
        @media print {
          body * { visibility: hidden; }
          .print-qr-sheet, .print-qr-sheet * { visibility: visible; }
          .print-qr-sheet { position: absolute; top: 0; left: 0; }
        }
      `}</style>
    </div>
  );
}
