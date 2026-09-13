# Relocation Page — `/moving`

Short public page announcing the move to the owned location at **4909 RM 2147,
Horseshoe Bay, TX 78657** (grand opening **Winter 2026**), one minute down
RM 2147 from the current leased shop.

**Kept intentionally short.** Owner directive (2026-09-13): four sections only —
moving announcement, the four renders, the map, and links back to online
ordering. The marketing lead is refining the copy next; do not re-grow the page
without their input.

## Sections

1. **We're moving** — address, "same coffee, same pastries, same team, same
   owners", first-ever owned location, grand-opening season, Get directions.
   Closing line: "Same coffee, same pastries, same team, same owners. Only the
   address changes — to our new specialty coffee house."
2. **The new shop** — the four renders (lightbox on click).
3. **Where we're going** — OpenStreetMap embed + address + directions.
4. **Order online while we build** — `/shop/coffee-beans` and `/shop/merch` only
   (shipping). Café food & beverage is **temporarily unavailable** during the
   transition, so there is deliberately **no** `/order` (pickup/menu) link here.
   Online shop stays open through the Winter 2026 grand opening.

## Files

| Path | Role |
| --- | --- |
| `src/app/(marketing)/moving/page.tsx` | The page (server component, `metadata` + canonical `https://kyndacoffee.com/moving`) |
| `src/lib/moving/content.ts` | Address, coords, map embed, render slots, ordering links |
| `src/components/moving/MovingGallery.tsx` | Render grid + accessible lightbox (Esc/arrows, focus return) |
| `public/images/moving/README.md` | Upload instructions next to the slot files |
| `e2e/moving.spec.ts` | Playwright coverage (sections, lightbox, banner link) |
| `src/lib/__tests__/moving-content.test.ts` | Content/slot/route invariants |

Also touched: `src/components/layout/RelocationBanner.tsx` (“See what’s coming →”),
`src/components/layout/Footer.tsx`, `src/app/sitemap.ts`.

## Render photos (currently in place)

Sourced from `~/…/Documents/_Kynda/4909 Rebuild/Renders/` (on /mnt/main),
resized to 2200 px wide, JPEG q85, ~300–600 KB each:

| Slot file | Source | Label |
| --- | --- | --- |
| `01-front-view.jpg` | `Kynda Coffee - Front view.jpg` | Front view |
| `02-front-view-alt.jpg` | `Kynda Coffee - Front view 3(2025.05.22).jpg` | Front view — patio & drive-thru |
| `03-lounge-view.jpg` | `Kynda Coffee - Lounge view (2025.05.22).jpg` | Lounge |
| `04-lounge-from-rear-bar.jpg` | `Kynda Coffee - Lounge view from rear bar 2 (2025.05.22).jpg` | Lounge from the rear bar |

Replacing one is a file swap at the same path — the page resolves slots with a
build-time filesystem check (`publicFileExists`), so a deploy publishes the new
image with no code change. Labels/order live in `GALLERY_SLOTS`.

Note: the "Front view — patio & drive-thru" render shows a drive-thru lane. That
is the owner's own render, but the lane is **not** mentioned in page copy yet —
confirm with the owner/marketing before advertising drive-thru service.

## Map precision

Coordinates `30.548272, -98.336904` come from the US Census address-range geocode
for 4909 W RM 2147 (TIGER range 4901–4999 on W Ranch Road 2147; reverse-geocode
returns 4901). That's an address-range point, not a surveyed pin — accurate to
roughly the parcel, and the Google "Get directions" link uses the street address
so navigation apps route correctly. The survey PDFs in `4909 Rebuild/` carry no
lat/long, and the old `/location` embed marker (30.5805, -98.4056) is ~7 km off —
never reuse it.

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

## Deliberately not on the page

Removed in the 2026-09-13 simplification (recoverable from git history):
features grid, construction timeline, FAQ, "Same Kynda, new home" photo strip,
and the move-updates email form. Also still unclaimed: exact opening date,
closure days during the move, and seat counts.
