# Kynda Coffee Agent Rules

Follow these rules in every session.

## Model & Profile Usage
- Default / heavy work: `x-ai/grok-4.3` via Nous
- Quick/local tasks: `qwen/qwen3.5-9b` via http://127.0.0.1:1234/v1 (LM Studio)
- Profiles: quick = local, primary/heavy = default (Grok 4.3)

## Worktree Policy
- Always use worktree mode (`-w`) for edits when available
- Max 5 concurrent children

## Git Workflow
- After every significant change or build: `npm run build`
- Commit using conventional commit messages
- Push immediately after commit

## Architecture
- POS-agnostic: Square for café, Printful for merch
- All pages follow charcoal/grey + rust design language
- Use existing Supabase, Square, and Printful integrations

## Tool Usage
- Prefer autonomous progress on concrete tasks
- Update KYND-COFFEE-MASTER-ROADMAP.md whenever major items are completed
- Always reference the living roadmap document

## Current Focus (June 2026)
High-impact quick wins first:
1. Loyalty Point Redemption
2. Subscription Engine
3. Real Email + SMS Automation

Then intelligence layer, customer experience, and polish.

Continue building until the platform is a complete production-grade digital operating system.