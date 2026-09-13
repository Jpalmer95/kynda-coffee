import fs from "node:fs";
import path from "node:path";

/**
 * Content + config for the relocation page (/moving).
 *
 * Everything the page shows about the new location lives here so copy, dates,
 * and render slots can be updated in one place.
 *
 * Adding real renders: drop a JPEG/PNG into `public/images/moving/` using the
 * filenames listed in GALLERY_SLOTS (see public/images/moving/README.md). The
 * slot picks it up automatically on the next deploy — no code change needed.
 */

export const NEW_LOCATION = {
  street: "4909 RM 2147",
  city: "Horseshoe Bay",
  state: "TX",
  zip: "78657",
  /** One-line summary used under the headline. */
  summary:
    "Our new home is just one minute down RM 2147 from the shop you know today.",
  /** Approximate site coordinates (from the county address range / survey area). */
  lat: 30.54827,
  lng: -98.3369,
  /** Target opening window — the user-facing season, not a firm date. */
  openingWindow: "Winter 2026",
} as const;

export const NEW_LOCATION_MAPS_URL =
  "https://maps.google.com/?q=4909+RM+2147,+Horseshoe+Bay,+TX+78657";

export const NEW_LOCATION_DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent("4909 RM 2147, Horseshoe Bay, TX 78657");

/** OpenStreetMap embed (no API key, no billing) centered on the new site. */
export const NEW_LOCATION_OSM_EMBED =
  "https://www.openstreetmap.org/export/embed.html" +
  "?bbox=-98.3489%2C30.5423%2C-98.3249%2C30.5543&layer=mapnik&marker=30.54827%2C-98.3369";

export type GallerySlot = {
  id: string;
  /** Short label shown on the tile. */
  label: string;
  /** What the render will show — shown in the lightbox and as helper text. */
  caption: string;
  /** Public path the file must live at. */
  file: string;
  alt: string;
};

/**
 * The four render slots on /moving. Order = display order.
 * `file` is contractual: the picture must be saved at exactly this path.
 */
export const GALLERY_SLOTS: GallerySlot[] = [
  {
    id: "exterior-entry",
    label: "Exterior & Entry",
    caption: "The new storefront and front entry, seen from RM 2147.",
    file: "/images/moving/01-exterior-entry.jpg",
    alt: "Rendering of the new Kynda Coffee exterior and entry",
  },
  {
    id: "coffee-bar",
    label: "Coffee Bar & Counter",
    caption: "The espresso bar and counter where your order comes together.",
    file: "/images/moving/02-coffee-bar.jpg",
    alt: "Rendering of the new Kynda Coffee espresso bar and counter",
  },
  {
    id: "seating-lounge",
    label: "Seating & Lounge",
    caption: "Indoor seating and lounge area for working, meeting, and lingering.",
    file: "/images/moving/03-seating-lounge.jpg",
    alt: "Rendering of the new Kynda Coffee indoor seating and lounge",
  },
  {
    id: "deck-parking",
    label: "Deck & Parking",
    caption: "The outdoor deck and the new dedicated parking area.",
    file: "/images/moving/04-deck-parking.jpg",
    alt: "Rendering of the new Kynda Coffee deck and parking area",
  },
];

export type ResolvedSlot = GallerySlot & { src: string | null };

/**
 * Resolve each slot to a real image path when the file exists on disk.
 * Renders placeholders for the slots that are still waiting on artwork.
 *
 * Server-only (reads the filesystem) — the page is statically rendered at
 * build time, so uploads go live with the next deploy.
 */
export function resolveGallerySlots(): ResolvedSlot[] {
  return GALLERY_SLOTS.map((slot) => ({
    ...slot,
    src: publicFileExists(slot.file) ? slot.file : null,
  }));
}

/** Count of slots that have artwork — handy for tests and logging. */
export function countFilledSlots(): number {
  return resolveGallerySlots().filter((s) => s.src !== null).length;
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

/** Verified features of the new site (source: architect site plan, 2026-06-03). */
export const NEW_LOCATION_FEATURES = [
  {
    title: "Parking that finally fits",
    body: "Seven dedicated spaces — four full-size, two compact, and one ADA-accessible space — right at the door.",
  },
  {
    title: "A driveway of our own",
    body: "A dedicated concrete driveway off RM 2147, so getting in and out stops being a negotiation.",
  },
  {
    title: "An outdoor deck",
    body: "A new deck for mornings with a cortado and slow afternoons in the shade.",
  },
  {
    title: "Room to grow",
    body: "More indoor space than we have today for seating, retail, and gathering. Final details land once build-out wraps.",
  },
] as const;

/** Progress timeline. Status: "done" | "active" | "upcoming". */
export const MOVE_TIMELINE = [
  {
    label: "Land secured",
    detail: "We bought 4909 RM 2147 — this one is ours, not a lease.",
    status: "done" as const,
  },
  {
    label: "Survey & site plan finished",
    detail: "Topographic survey and the architect's site plan are complete.",
    status: "done" as const,
  },
  {
    label: "Site work & construction",
    detail: "Driveway, utilities, and the building itself.",
    status: "active" as const,
  },
  {
    label: "Build-out & inspections",
    detail: "Interior finishes, equipment, permits, and staff training.",
    status: "upcoming" as const,
  },
  {
    label: `Doors open — ${NEW_LOCATION.openingWindow}`,
    detail: "Exact dates announced as we get closer.",
    status: "upcoming" as const,
  },
] as const;

/** Safe, non-operational FAQs. Nothing here promises dates we don't control. */
export const MOVE_FAQS = [
  {
    q: "Is the current shop still open?",
    a: "Yes — nothing changes until we move. Same hours, same menu, same team at our current location on RM 2147.",
  },
  {
    q: "Will there be a closure during the move?",
    a: "We expect a few days dark while we move equipment and train the team in the new space. We'll announce those dates well ahead of time here and by email.",
  },
  {
    q: "Where exactly is the new shop?",
    a: `At ${NEW_LOCATION.street}, ${NEW_LOCATION.city}, ${NEW_LOCATION.state} ${NEW_LOCATION.zip} — about a minute west of where we are now, on the same stretch of RM 2147.`,
  },
  {
    q: "Do rewards, gift cards, and online ordering still work?",
    a: "Yes. Your rewards balance, gift cards, and online ordering all carry over — there's nothing you need to do.",
  },
  {
    q: "Is the menu changing?",
    a: "Your favorites are moving with us. The new kitchen gives us room to add seasonal specials and more scratch-made items over time.",
  },
  {
    q: "How do I get updates?",
    a: "Join the updates list at the bottom of this page — we'll email renderings, milestone news, and the opening date as they land.",
  },
] as const;

/** Existing brand photography reused on the page (real shots of Kynda today). */
export const KYNDA_TODAY_PHOTOS = [
  {
    src: "/images/hero-coffee.jpg",
    alt: "Coffee being poured into a Kynda Coffee mug",
    caption: "Same beans, same baristas.",
  },
  {
    src: "/images/ceramic-mug.jpg",
    alt: "Kynda Coffee ceramic mug",
    caption: "Same mugs on the shelf.",
  },
  {
    src: "/images/coffee-beans.jpg",
    alt: "Freshly roasted Kynda Coffee beans",
    caption: "Same roast, same standards.",
  },
] as const;
