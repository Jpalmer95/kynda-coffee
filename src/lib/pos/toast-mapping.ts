/**
 * Toast → normalized catalog mapping (Roadmap V2 — Epic 10, POS portability).
 *
 * Pure functions that translate Toast's Menus API v2 shape into the SAME
 * normalized `products` row the Square sync produces. This is the crux of the
 * "POS-agnostic" promise: the frontend reads `products`/`pos_*` and never knows
 * which POS filled them. Keeping the mapping pure makes portability *testable*
 * without hitting Toast's API.
 *
 * Toast Menus API v2 returns a tree: menus[] → menuGroups[] → menuItems[].
 * A menuItem has guid, name, description, price (dollars), and visibility.
 */

export interface ToastMenuItem {
  guid: string;
  name?: string;
  description?: string;
  /** Toast prices are in DOLLARS (number), unlike Square's integer cents. */
  price?: number;
  /** Toast uses visibility/availability flags; absent = visible. */
  visibility?: string | null;
  /** Some payloads carry images as an array of URLs. */
  images?: Array<{ url?: string }> | string[];
}

export interface ToastMenuGroup {
  guid?: string;
  name?: string;
  menuItems?: ToastMenuItem[];
}

export interface ToastMenu {
  guid?: string;
  name?: string;
  menuGroups?: ToastMenuGroup[];
}

/** The normalized product row shape written to the `products` table. */
export interface NormalizedProduct {
  slug: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  is_active: boolean;
  images: string[];
}

export function slugify(name: string, fallbackId: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s.length > 0 ? s : `toast-${fallbackId}`;
}

/** Map a Toast group name to the platform's category vocabulary (mirror of Square's mapper intent). */
export function mapToastCategory(groupName?: string): string {
  const n = (groupName ?? "").toLowerCase();
  if (/coffee|espresso|latte|drink|beverage|tea/.test(n)) return "cafe";
  if (/pastry|bakery|food|sandwich|breakfast|lunch/.test(n)) return "food";
  if (/bean|roast|bag|retail/.test(n)) return "coffee-beans";
  if (/merch|apparel|gear|mug/.test(n)) return "merch";
  return "cafe";
}

function extractImages(item: ToastMenuItem): string[] {
  if (!item.images) return [];
  return (item.images as Array<{ url?: string } | string>)
    .map((img) => (typeof img === "string" ? img : img?.url))
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0);
}

/** Toast prices are dollars; the platform stores integer cents. */
export function toCents(price: number | undefined | null): number {
  if (price == null || !Number.isFinite(price)) return 0;
  return Math.round(price * 100);
}

/** Map one Toast menu item (+ its group) to a normalized product row. */
export function mapToastItemToProduct(item: ToastMenuItem, groupName?: string): NormalizedProduct {
  const name = item.name?.trim() || "Unknown";
  return {
    slug: slugify(name, item.guid),
    name,
    description: item.description?.trim() ?? "",
    category: mapToastCategory(groupName),
    price_cents: toCents(item.price),
    // Toast visibility: explicit "HIDDEN"/"NONE" means not active; otherwise active.
    is_active: !item.visibility || !/hidden|none/i.test(item.visibility),
    images: extractImages(item),
  };
}

/** Flatten a Toast menu tree into normalized product rows (deduped by slug). */
export function mapToastMenusToProducts(menus: ToastMenu[]): NormalizedProduct[] {
  const out: NormalizedProduct[] = [];
  const seen = new Set<string>();
  for (const menu of menus ?? []) {
    for (const group of menu.menuGroups ?? []) {
      for (const item of group.menuItems ?? []) {
        if (!item?.guid) continue;
        const product = mapToastItemToProduct(item, group.name);
        if (seen.has(product.slug)) continue;
        seen.add(product.slug);
        out.push(product);
      }
    }
  }
  return out;
}
