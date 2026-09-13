# Relocation Page — `/moving`

Public page announcing the move to the owned location at **4909 RM 2147,
Horseshoe Bay, TX 78657** (target: **Winter 2026**), one minute down RM 2147 from
the current leased shop.

## Files

| Path | Role |
| --- | --- |
| `src/app/(marketing)/moving/page.tsx` | Page (server component, `metadata` + canonical `https://kyndacoffee.com/moving`) |
| `src/app/(marketing)/moving/loading.tsx` | Route loading state |
| `src/lib/moving/content.ts` | All copy/data: address, coords, features, timeline, FAQ, render slots |
| `src/components/moving/MovingGallery.tsx` | Render grid + accessible lightbox (Esc/arrows, focus return) |
| `src/components/moving/MovingUpdatesForm.tsx` | Move-updates email capture (`source: "moving_page"`) |
| `public/images/moving/README.md` | Upload instructions sitting next to the slot files |
| `e2e/moving.spec.ts` | Playwright coverage (address, banner link, lightbox, form) |
| `src/lib/__tests__/moving-content.test.ts` | Content/slot invariants |

Also touched: `src/components/layout/RelocationBanner.tsx` (adds “See what’s
coming →”), `src/components/layout/Footer.tsx`, `src/app/sitemap.ts`.

## Uploading the renderings

Drop files into `public/images/moving/` using these names — the page swaps the
placeholder for the real image automatically on the next deploy:

```
01-exterior-entry.jpg    → "Exterior & Entry"
02-coffee-bar.jpg        → "Coffee Bar & Counter"
03-seating-lounge.jpg    → "Seating & Lounge"
04-deck-parking.jpg      → "Deck & Parking"
```

The lookup is a build-time filesystem check (`publicFileExists` in
`src/lib/moving/content.ts`), so **creating/applying a deploy publishes the new
images** — no code edit required. Labels, captions, and alt text live in
`GALLERY_SLOTS`. For remote artwork (e.g. Supabase Storage), point the slot at a
URL and add the host to `images.remotePatterns` in `next.config.ts`.

While a slot is empty it renders a branded "Render coming soon" tile, and the
counter under the grid reads “N of 4 renderings posted”.

## Published facts (and where they came from)

- Address + "1 minute down the road": owner directive; the site sits ~0.6 km west
  of the current shop on the same stretch of W RM 2147.
- Map coordinates `30.54827, -98.3369`: US Census address-range geocode for
  4909 W FM 2147 (reverse-geocode lands on 4901 W Ranch Road 2147, Burnet
  County). Treat as approximate — the OSM embed pin is neighborhood-accurate.
- Parking, driveway, deck, lot: architect site plan
  (`~/Documents/Kynda-Coffee/Site Plans/A2.2 K.C SITE PLAN - SITE PLAN (2026.06.03).pdf`)
  — 4 × 9'×24' + 2 × 9'×18' + 1 ADA 9'×20' space, dedicated concrete driveway off
  FM 2147, deck, lot ≈0.489 acres.
- Timeline milestones: land purchase, survey/site plan (Jun 2026) are complete;
  construction, build-out, and opening are stated as in-progress/upcoming.

The architect's site plan is **not** published on the page: the drawing carries
an explicit "may not be reproduced in any form without expressed permission from
the Architect" notice. Get written permission from Living Architecture before
posting drawings, plan excerpts, or dimensions.

## Running the e2e spec locally

`npx playwright test e2e/moving.spec.ts` fails on this workstation: the repo's
pinned Playwright build wants `chromium_headless_shell-1223`, which cannot be
installed on Ubuntu 26.04. Point a throwaway config at the Chromium already in
`~/.cache/ms-playwright` instead (delete the config afterwards):

```ts
// pw.verify.config.ts
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3000",
    launchOptions: {
      executablePath: "/home/jonathan/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

`npx playwright test e2e/moving.spec.ts -c pw.verify.config.ts` (reuses a dev
server already on :3000). Note `getByRole("dialog")` needs a name filter here —
the site chrome mounts a cart drawer with `role="dialog"`.

## Deliberately not claimed (needs owner confirmation before publishing)

- An exact opening date (page says "Winter 2026" / "exact dates announced").
- Closure days during the move (page says a few days, dates TBD).
- Seat counts, drive-thru, or expanded menu specifics.
