# Move renderings — upload space for /moving

Drop (or replace) the new-location renders here using these exact filenames. The
/moving page checks for each file at build time and shows it automatically — no
code change needed.

    public/images/moving/01-front-view.jpg              → "Front view"
    public/images/moving/02-front-view-alt.jpg          → "Front view — patio & drive-thru"
    public/images/moving/03-lounge-view.jpg             → "Lounge"
    public/images/moving/04-lounge-from-rear-bar.jpg    → "Lounge from the rear bar"

Notes

- Landscape 16:9 is what the tiles crop to (current files are 2200×1238).
- Keep each file under ~600 KB so the page stays fast.
- Labels, alt text, and the render order live in `GALLERY_SLOTS` in
  `src/lib/moving/content.ts` — edit there to rename or reorder.
- If a file is missing, the tile shows a branded "Render coming soon"
  placeholder instead of a broken image.
- Want artwork hosted elsewhere (e.g. Supabase Storage)? Point the slot at a
  remote URL and add the host to `images.remotePatterns` in `next.config.ts`.

After uploading: commit, push, and let Coolify redeploy — the page renders at
build time, so new renders go live with the deploy.
