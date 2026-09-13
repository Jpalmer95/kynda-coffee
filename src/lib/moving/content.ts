import fs from "node:fs";
import path from "node:path";

/**
 * Content for the relocation page (/moving).
 *
 * Kept deliberately small: the marketing lead is refining the copy, so all
 * strings live here for easy editing.
 *
 * Swapping/adding render photos: replace the file at the slot's `file` path
 * (public/images/moving/) — the page picks it up at build time, no code change.
 */

export const NEW_LOCATION = {
  street: "4909 RM 2147",
  city: "Horseshoe Bay",
  state: "TX",
  zip: "78657",
  /** Target opening window — not a firm date. */
  openingWindow: "Winter 2026",
  /** Approximate site location (county address range for 4909 W RM 2147). */
  lat: 30.548272,
  lng: -98.336904,
} as const;

/**
 * Online ordering stays open while the new shop is built: end of September 2026
 * through the Winter 2026 grand opening.
 */
export const ONLINE_ORDERING_WINDOW = "now through our Winter 2026 grand opening";

export const NEW_LOCATION_MAPS_URL =
  "https://maps.google.com/?q=4909+RM+2147,+Horseshoe+Bay,+TX+78657";

export const NEW_LOCATION_DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent("4909 RM 2147, Horseshoe Bay, TX 78657");

/** OpenStreetMap embed (no API key, no billing). */
export const NEW_LOCATION_OSM_EMBED =
  "https://www.openstreetmap.org/export/embed.html" +
  "?bbox=-98.3449%2C30.5448%2C-98.3289%2C30.5517&layer=mapnik&marker=30.548272%2C-98.336904";

export type GallerySlot = {
  id: string;
  label: string;
  file: string;
  alt: string;
};

/** The four renders shown on the page, in display order. */
export const GALLERY_SLOTS: GallerySlot[] = [
  {
    id: "front-view",
    label: "Front view",
    file: "/images/moving/01-front-view.jpg",
    alt: "Rendering of the new Kynda Coffee shop, front view",
  },
  {
    id: "front-view-alt",
    label: "Front view — patio & drive-thru",
    file: "/images/moving/02-front-view-alt.jpg",
    alt: "Rendering of the new Kynda Coffee shop from the drive-thru lane",
  },
  {
    id: "lounge-view",
    label: "Lounge",
    file: "/images/moving/03-lounge-view.jpg",
    alt: "Rendering of the new Kynda Coffee lounge seating",
  },
  {
    id: "lounge-rear-bar",
    label: "Lounge from the rear bar",
    file: "/images/moving/04-lounge-from-rear-bar.jpg",
    alt: "Rendering of the new Kynda Coffee lounge and retail bar",
  },
];

export type ResolvedSlot = GallerySlot & { src: string | null };

/**
 * Resolve each slot to its image when the file exists on disk (build-time check)
 * and fall back to a branded placeholder otherwise.
 */
export function resolveGallerySlots(): ResolvedSlot[] {
  return GALLERY_SLOTS.map((slot) => ({
    ...slot,
    src: publicFileExists(slot.file) ? slot.file : null,
  }));
}

function publicFileExists(publicPath: string): boolean {
  try {
    const abs = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
    return fs.statSync(abs).isFile();
  } catch {
    // Missing file (or unreadable) → treat as an empty slot.
    return false;
  }
}

/** Where customers can keep ordering while the new shop is built. */
export const ORDERING_LINKS = [
  {
    href: "/shop/coffee-beans",
    label: "Coffee beans",
    detail: "Whole bean and ground, shipped to your door.",
  },
  {
    href: "/shop/merch",
    label: "Kynda merch",
    detail: "Mugs, apparel, and gear.",
  },
  {
    href: "/order",
    label: "Order for pickup",
    detail: "Our current shop on RM 2147.",
  },
] as const;
