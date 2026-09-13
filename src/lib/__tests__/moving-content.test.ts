import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GALLERY_SLOTS,
  NEW_LOCATION,
  ORDERING_LINKS,
  resolveGallerySlots,
} from "@/lib/moving/content";

/**
 * Relocation page (/moving) content guards.
 *
 * The page publishes a real address and real render file paths, so these tests
 * lock the contract: four slots, files where the docs say they live, and
 * placeholder/image resolution that always agrees with what is on disk.
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
      expect(slot.alt.length).toBeGreaterThan(0);
    }
  });

  it("ships all four render files on disk", () => {
    for (const slot of GALLERY_SLOTS) {
      expect(
        existsSync(join(PUBLIC_DIR, slot.file.replace(/^\//, ""))),
        `${slot.file} is missing`
      ).toBe(true);
    }
  });

  it("resolves a slot to an image only when that file exists on disk", () => {
    const resolved = resolveGallerySlots();
    expect(resolved).toHaveLength(GALLERY_SLOTS.length);

    for (const slot of resolved) {
      const onDisk = existsSync(join(PUBLIC_DIR, slot.file.replace(/^\//, "")));
      expect(slot.src === null).toBe(!onDisk);
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

  it("links online ordering surfaces that exist in the app", () => {
    const hrefs = ORDERING_LINKS.map((l) => l.href);
    expect(hrefs).toContain("/shop/coffee-beans");
    expect(hrefs).toContain("/shop/merch");
    expect(hrefs).toContain("/order");

    // Direct routes (e.g. /order, /shop/merch) must have their own page.tsx.
    for (const href of ["/order", "/shop/merch"]) {
      const seg = href.replace(/^\//, "");
      const candidates = [
        join(ROOT, "src", "app", seg, "page.tsx"),
        join(ROOT, "src", "app", "(marketing)", seg, "page.tsx"),
      ];
      expect(candidates.some((c) => existsSync(c)), `no page.tsx for ${href}`).toBe(
        true
      );
    }

    // Category links (e.g. /shop/coffee-beans) resolve through the dynamic
    // /shop/[category] route, and the slug must be advertised in the shop's
    // own category list or the link lands on an empty category page.
    expect(existsSync(join(ROOT, "src", "app", "shop", "[category]", "page.tsx"))).toBe(
      true
    );
    const shopSource = readFileSync(join(ROOT, "src", "app", "shop", "page.tsx"), "utf8");
    for (const href of hrefs.filter((h) => h.startsWith("/shop/"))) {
      const slug = href.split("/")[2];
      // Slugs with their own route (e.g. /shop/merch) skip the category check.
      if (existsSync(join(ROOT, "src", "app", "shop", slug, "page.tsx"))) continue;
      expect(shopSource).toContain(`slug: "${slug}"`);
    }
  });
});
