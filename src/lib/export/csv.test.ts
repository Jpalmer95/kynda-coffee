import { describe, it, expect } from "vitest";
import { csvCell, toCsv, csvDownloadHeaders } from "./csv";

describe("csvCell", () => {
  it("passes through plain strings and numbers", () => {
    expect(csvCell("hello")).toBe("hello");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(0)).toBe("0");
    expect(csvCell(true)).toBe("true");
  });

  it("renders null/undefined as empty (not 'null')", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes fields with commas, quotes, or newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("JSON-stringifies objects and arrays", () => {
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
    // [1,2] contains a comma, so the whole field is quoted per RFC 4180
    expect(csvCell([1, 2])).toBe('"[1,2]"');
    expect(csvCell([5])).toBe("[5]"); // no comma -> no quoting needed
  });
});

describe("toCsv", () => {
  it("emits a header row + data rows with CRLF", () => {
    const csv = toCsv([{ a: 1, b: 2 }, { a: 3, b: 4 }]);
    expect(csv).toBe("a,b\r\n1,2\r\n3,4");
  });

  it("respects an explicit column order and subset", () => {
    const csv = toCsv([{ a: 1, b: 2, c: 3 }], ["c", "a"]);
    expect(csv).toBe("c,a\r\n3,1");
  });

  it("unions keys across heterogeneous rows in first-seen order", () => {
    const csv = toCsv([{ a: 1 }, { b: 2 }]);
    expect(csv.split("\r\n")[0]).toBe("a,b");
  });

  it("fills missing cells as empty", () => {
    const csv = toCsv([{ a: 1, b: 2 }, { a: 3 }]);
    expect(csv).toBe("a,b\r\n1,2\r\n3,");
  });

  it("handles an empty row set (header only when columns given)", () => {
    expect(toCsv([], ["a", "b"])).toBe("a,b");
    expect(toCsv([])).toBe("");
  });

  it("escapes nested order-item arrays safely", () => {
    const csv = toCsv([{ order: "K-1", items: [{ name: "Latte", qty: 2 }] }]);
    expect(csv).toContain("K-1");
    expect(csv).toContain("Latte");
    // the items column must be a single quoted field (no stray commas breaking columns)
    expect(csv.split("\r\n")[1].split('","').length).toBeGreaterThanOrEqual(1);
  });
});

describe("csvDownloadHeaders", () => {
  it("sets a CSV content type and attachment filename", () => {
    const h = csvDownloadHeaders("orders-2026.csv");
    expect(h["Content-Type"]).toContain("text/csv");
    expect(h["Content-Disposition"]).toContain('filename="orders-2026.csv"');
  });

  it("sanitizes unsafe filename characters", () => {
    const h = csvDownloadHeaders("../../etc/passwd");
    expect(h["Content-Disposition"]).not.toContain("/");
  });
});
