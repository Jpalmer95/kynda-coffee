import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  GALLERY_SLOTS,
  MOVE_FAQS,
  NEW_LOCATION,
  NEW_LOCATION_FEATURES,
  resolveGallerySlots,
} from "@/lib/moving/content";

/**
 * Relocation page (/moving) content guards.
 *
 * The page publishes a real address and real construction claims, so these
 * tests lock the contract: four render slots, slot files that live where the
 * docs say they live, and placeholder/image resolution that always agrees with
 * what is actually on disk.
 */

const ROOT = join(__dirname, "..", "..", "..");
const PUBLIC_DIR = join(ROOT, "public");

describe("moving page: render slots", () => {
  it("defines exactly four slots", () => {
    expect(GALLERY_SLOTS).toHaveLength(4);
  });

  it("uses unique ids and unique file paths", () => {
    const ids = GALLERY_SLOTS.map((s) => s.id);
    const files = GALLERY_SLOTS.map((s) => s.file);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(files).size).toBe(files.length);
  });

  it("points every slot at public/images/moving/", () => {
    for (const slot of GALLERY_SLOTS) {
      expect(slot.file.startsWith("/images/moving/")).toBe(true);
      expect(slot.label.length).toBeGreaterThan(0);
      expect(slot.caption.length).toBeGreaterThan(0);
      expect(slot.alt.length).toBeGreaterThan(0);
    }
  });

  it("resolves a slot to an image only when that file exists on disk", () => {
    const resolved = resolveGallerySlots();
    expect(resolved).toHaveLength(GALLERY_SLOTS.length);

    for (const slot of resolved) {
      const onDisk = existsSync(
        join(PUBLIC_DIR, slot.file.replace(/^\//, ""))
      );
      expect(slot.src === null).toBe(!onDisk);
      if (!onDisk) expect(slot.src).toBeNull();
    }
  });

  it("keeps the upload instructions next to the slot files", () => {
    expect(existsSync(join(PUBLIC_DIR, "images", "moving", "README.md"))).toBe(true);
  });
});

describe("moving page: published facts", () => {
  it("publishes the new owned address", () => {
    expect(NEW_LOCATION.street).toBe("4909 RM 2147");
    expect(NEW_LOCATION.city).toBe("Horseshoe Bay");
    expect(NEW_LOCATION.state).toBe("TX");
    expect(NEW_LOCATION.zip).toBe("78657");
    expect(NEW_LOCATION.openingWindow).toBe("Winter 2026");
  });

  it("keeps coordinates in the Horseshoe Bay / Cottonwood Shores area", () => {
    expect(NEW_LOCATION.lat).toBeGreaterThan(30.5);
    expect(NEW_LOCATION.lat).toBeLessThan(30.6);
    expect(NEW_LOCATION.lng).toBeGreaterThan(-98.4);
    expect(NEW_LOCATION.lng).toBeLessThan(-98.3);
  });

  it("has non-empty features and FAQs", () => {
    expect(NEW_LOCATION_FEATURES.length).toBeGreaterThanOrEqual(3);
    expect(MOVE_FAQS.length).toBeGreaterThanOrEqual(4);
    for (const f of NEW_LOCATION_FEATURES) expect(f.body.length).toBeGreaterThan(20);
    for (const q of MOVE_FAQS) expect(q.a.length).toBeGreaterThan(20);
  });
});
