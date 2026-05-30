import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Accessibility regression guards (Roadmap V2 — Epic 9).
 *
 * The customer-facing surfaces already meet the WCAG 2.2 AA basics (verified by
 * review): a skip link, a lang attribute, ARIA live regions, labeled controls,
 * reduced-motion + focus-visible styling. These static assertions lock those
 * invariants in so a future refactor can't silently regress them. They read the
 * source files directly — no DOM/browser needed — and fail loudly if a load-
 * bearing a11y affordance disappears.
 */

const ROOT = join(__dirname, "..", "..", "..");
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("a11y: document & landmarks", () => {
  const layout = read("src/app/layout.tsx");

  it("declares a language on <html>", () => {
    expect(layout).toMatch(/<html[^>]*\slang=/);
  });

  it("renders a <main> landmark with id main-content and is focusable", () => {
    expect(layout).toMatch(/<main[^>]*id="main-content"/);
    expect(layout).toMatch(/<main[^>]*tabIndex=\{-1\}/);
  });

  it("includes the SkipLink and a polite cart live-region", () => {
    expect(layout).toContain("<SkipLink />");
    expect(layout).toMatch(/aria-live="polite"/);
  });
});

describe("a11y: skip link targets the main landmark", () => {
  it("SkipLink href matches the main content id", () => {
    const skip = read("src/components/ui/SkipLink.tsx");
    expect(skip).toContain('href="#main-content"');
    // and it must be visually-hidden-until-focused (sr-only + focus reveal)
    expect(skip).toMatch(/sr-only/);
    expect(skip).toMatch(/focus:not-sr-only/);
  });
});

describe("a11y: motion & focus", () => {
  const css = read("src/styles/globals.css");

  it("honors prefers-reduced-motion", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it("provides a visible focus indicator", () => {
    expect(css).toMatch(/:focus-visible\s*\{/);
  });
});

describe("a11y: contact form inputs are labeled", () => {
  const contact = read("src/app/(marketing)/contact/page.tsx");

  it("associates labels with inputs via htmlFor/id (not placeholder-only)", () => {
    // Every interactive id referenced by the form should have a matching label htmlFor.
    const ids = Array.from(contact.matchAll(/\bid="([a-z-]+)"/g)).map((m) => m[1]);
    const labelFors = new Set(Array.from(contact.matchAll(/htmlFor="([a-z-]+)"/g)).map((m) => m[1]));
    // Core fields must be labeled.
    for (const required of ["name", "email", "message"]) {
      expect(ids).toContain(required);
      expect(labelFors.has(required)).toBe(true);
    }
  });
});

describe("a11y: icon-only dialog controls are labeled", () => {
  it("MenuItemDialog close + quantity steppers have aria-labels", () => {
    const dlg = read("src/components/menu/MenuItemDialog.tsx");
    expect(dlg).toMatch(/aria-label="Close"/);
    expect(dlg).toMatch(/aria-label="Increase quantity"/);
    expect(dlg).toMatch(/aria-label=\{quantity === 1 \? "Cancel" : "Decrease quantity"\}/);
  });
});
