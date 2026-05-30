/**
 * CSV serialization (Roadmap V2 — Epic 10, data ownership).
 *
 * Pure, RFC-4180-compliant CSV generation so the owner can export business data
 * to plain files that open cleanly in Excel / Google Sheets / anything. Used by
 * the admin data-export endpoints. No DB/network here.
 *
 * Correctness details that matter for "I own my data":
 *  - Fields containing comma, double-quote, CR or LF are quoted; embedded quotes
 *    are doubled ("" ) per RFC 4180.
 *  - null/undefined become empty cells (not the string "null").
 *  - Objects/arrays are JSON-stringified so nested data (e.g. order items) survives.
 *  - A header row is derived from explicit columns or the union of object keys.
 */

export type CsvCell = string | number | boolean | null | undefined | object;
export type CsvRow = Record<string, CsvCell>;

function needsQuoting(s: string): boolean {
  return /[",\r\n]/.test(s);
}

/** Serialize one cell to a CSV-safe string. */
export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (typeof value === "object") {
    s = JSON.stringify(value);
  } else {
    s = String(value);
  }
  if (needsQuoting(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Serialize an array of row objects to a CSV string (with header row).
 * Columns: if provided, used verbatim (controls order + which fields appear);
 * otherwise the union of all keys across rows, in first-seen order.
 */
export function toCsv(rows: CsvRow[], columns?: string[]): string {
  const cols =
    columns && columns.length
      ? columns
      : (() => {
          const seen: string[] = [];
          const set = new Set<string>();
          for (const r of rows) {
            for (const k of Object.keys(r)) {
              if (!set.has(k)) {
                set.add(k);
                seen.push(k);
              }
            }
          }
          return seen;
        })();

  const lines: string[] = [];
  lines.push(cols.map(csvCell).join(","));
  for (const r of rows) {
    lines.push(cols.map((c) => csvCell(r[c])).join(","));
  }
  // CRLF line endings are the RFC-4180 default and the safest for Excel.
  return lines.join("\r\n");
}

/** Build the standard Content-Disposition + type headers for a CSV download. */
export function csvDownloadHeaders(filename: string): Record<string, string> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safe}"`,
  };
}

/**
 * Client-side helper: trigger a browser download of a CSV string. Safe no-op
 * outside the browser (SSR). Used by admin pages that build a CSV in-memory.
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === "undefined") return;
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safe;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
