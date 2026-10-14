# Kynda Coffee Agent Rules

Follow these rules in every session.

## Model & Profile Usage
- `default` / `primary` / `heavy` are all `deepseek/deepseek-v4.1-flash` via Nous Portal — they differ only in `max_turns`
- `quick` / `localqwen9b`: `qwen/qwen3.5-9b` via LM Studio `http://127.0.0.1:1234/v1` — unavailable whenever LM Studio is down
- Fallback chain: `grok-4.6` (xAI OAuth) → local qwen

## Worktree Policy
- Always use worktree mode (`-w`) for edits when available
- Max 10 concurrent children (`delegation.max_concurrent_children`)

## Git Workflow
- After every significant change or build: `npm run build`
- Commit using conventional commit messages
- Push immediately after commit

## Deployment
- Push to GitHub **and** trigger a Coolify re-deploy — pushing alone does not ship
- Host: Coolify on droplet `167.99.125.127`; container path `/var/www/kynda-coffee-new`
- Live: https://kyndacoffee.com · Dev (NOT live): https://kynda.167.99.125.127.sslip.io

## Architecture
- POS-agnostic: Square for café, Printful for merch
- Use existing Supabase, Square, and Printful integrations
- **Design System:** Follow `DESIGN.md` as the single source of truth for all visual, typographic, color, and component decisions (Modern Artisan / Organic-Tech palette)

## Business rules that are easy to break
- The cart drawer must **never** open by default
- Admin routes: Supabase auth + allowlist `jpkorstad@gmail.com`
- Explicit per-product markup tiers: **mugs 2.8×, apparel 2.5×**
- MenuMetrics is the source of truth for ingredient costs — do not duplicate cost data here

## Roadmap
- `MASTER_PLAN.md` — authoritative roadmap (phases + recorded decisions)
- `KYND-COFFEE-MASTER-ROADMAP.md` — living feature roadmap; update when major items complete
- Cross-cutting context (entity structure, operating rules, brand direction, module topology): `~/dev/knowledge` → `wiki/index.md`

## Tool Usage
- Prefer autonomous progress on concrete tasks
- Always reference the living roadmap document

Continue building until the platform is a complete production-grade digital operating system.
