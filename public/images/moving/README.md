# Move renderings — upload space for /moving

Drop the new-location renderings in this folder using these exact filenames.
The /moving page checks for each file at build time and swaps its placeholder
tile for the real image automatically — no code change needed.

    public/images/moving/01-exterior-entry.jpg   → "Exterior & Entry"
    public/images/moving/02-coffee-bar.jpg       → "Coffee Bar & Counter"
    public/images/moving/03-seating-lounge.jpg   → "Seating & Lounge"
    public/images/moving/04-deck-parking.jpg     → "Deck & Parking"

Notes

- JPEG or PNG both work; keep the base name identical (`.png` is detected too —
  see `publicFileExists` in `src/lib/moving/content.ts` if you need a new rule).
- Landscape 4:3 (e.g. 2000×1500) matches the tile crop best. Anything larger is
  fine — next/image resizes per request.
- Target under ~600 KB each so the page stays fast.
- To change a label, caption, or alt text, edit `GALLERY_SLOTS` in
  `src/lib/moving/content.ts`.
- Want a slot that isn't a local file (e.g. a Supabase Storage URL)? Point the
  slot at a remote URL in `GALLERY_SLOTS` and add the host to
  `images.remotePatterns` in `next.config.ts`.

After uploading: commit, push, and let Coolify redeploy — the page renders at
build time, so uploads go live with the deploy.
