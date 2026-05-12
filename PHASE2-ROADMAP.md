# Kynda Coffee Phase 2 Roadmap

**Created:** 2026-06-12  
**Status:** New comprehensive roadmap consolidated from all prior planning.  
**Goal:** Turn Kynda Coffee into a next-generation, scalable digital platform and e-commerce hub for a growing small business.

---

## 1. Structured Phase 2 Roadmap

Organized by priority with **Effort vs Impact** ratings (High Impact = 5–10x business value).

### High-Impact Quick Wins (Start Here)
- [ ] **Referral / Affiliate Sales System** — Effort: Medium | Impact: Very High
- [ ] **Marketing Campaign Execution** (scheduler + segmentation) — Effort: Medium | Impact: High

### Scalability Features
- [ ] AI Insights Dashboard (`/admin/insights`) — Effort: Medium | Impact: High
- [ ] Predictive Staffing — Effort: High | Impact: High
- [ ] Inventory Forecasting & Auto-Reorder — Effort: High | Impact: Very High

### Customer Experience
- [ ] Customer Account & Order Tracking Portal — Effort: Low | Impact: High
- [ ] Enhanced Admin Settings & Controls — Effort: Low | Impact: Medium

### Operations & Intelligence
- [ ] MenuMetrics Integration (cost/density + vendor polling) — Effort: High | Impact: Very High
- [ ] Autonomous Reorder Triggers + Alerts — Effort: Medium | Impact: High

### Future Opportunities
- Coffee Tech SaaS (white-label tools)
- B2B Marketplace
- Private-label Merch expansion
- Data Insights as a Service
- Events & Experiences tied to platform

---

## 2. Referral / Affiliate Sales Opportunity (Priority #1)

### Core Flow
- Anyone signs up at `/refer` or via account dashboard → receives a unique referral code.
- New customer enters code at checkout → **10% off first order**.
- Referrer earns **meaningful reward** (e.g. $10 credit or 15% of first order value, capped to preserve margins).
- All tracked server-side with expiry, fraud prevention, and attribution.

### Database Additions (new migration)
- `referral_codes` table
- `referrals` table (source, target, status, reward_issued)
- `affiliate_payouts` table

### Pages & Components
- `/refer` – Public landing + signup form
- Account dashboard – “My Referrals” with earnings & shareable link
- Admin `/admin/affiliates` – Full CRUD, payout queue, performance metrics

### Admin Tools
- List all affiliates with total referred revenue & rewards owed
- Manual or bulk payout trigger (Stripe payout or store credit)
- Export CSV + audit log

**Reward Structure (healthy margins):**
- New customer: 10% first-order discount (cost absorbed in marketing budget)
- Referrer: $10 store credit OR 500 loyalty points + $5 cash equivalent (after 3 successful referrals)
- Tier bonuses after 10+ successful referrals

---

## 3. Marketing Automation Platform (Folder-to-Feed)

### Core Promise
Team only needs to drop images/assets into a designated folder (via Dropbox, Google Drive, or direct upload).  

The platform then runs fully autonomously:

1. **Asset ingestion** (watch folder / web upload)
2. **AI generation** (Flux + GPT-4o)
   - Platform-optimized captions, hooks, and 5–8 hashtag sets per post
   - Variations generated for:
     - X (Twitter)
     - Instagram (feed + story + reel)
     - Facebook
     - Threads
     - YouTube Shorts
     - Bluesky
     - TikTok
     - Twitch (clip titles + chat commands)
3. **Scheduling engine** – posts at optimal times using historical engagement data
4. **Optional human review** – queue approval step before publishing
5. **Performance tracking** – comments, saves, clicks funneled back into Kynda dashboard

### Technical Components
- Folder watcher (webhook + polling)
- AI pipeline (`/api/marketing/agent`)
- Multi-platform publisher (Twitter API v2, Meta Graph, TikTok, YouTube, Twitch)
- Review dashboard `/admin/marketing/queue`
- Cross-branded Gaming Account content engine (for new canned energy/coffee line)

### Gaming / Energy Drink Extension
- Separate branded Twitch & YouTube channel (“Kynda Gaming”)
- Content focused on late-night coding/streaming with canned Kynda Energy
- Automated Shorts & clips generated from long-form VODs
- Merch tie-ins (energy drink branded hoodies, mousepads) via Design Studio

---

## 4. MenuMetrics Integration Plan

### Philosophy
Keep a **separate open-source GitHub repo** (`MenuMetrics`) for standalone use by other cafés.  
Kynda platform consumes it via API or embedded module.

### Current Features (MenuMetrics standalone)
- Recipe cost-per-ounce / cost-per-cup calculations
- Density & yield tracking (brew strength, waste, batch sizing)
- Margin guardrails per menu item

### Kynda Integration
- Import Square product recipes into MenuMetrics engine
- Real-time margin visibility inside admin inventory & product pages
- Dashboard showing “most profitable drinks” and “cost creep alerts”

### Future Autonomous Enhancements
- Agent-based ingredient import from supplier invoices (OCR)
- Vendor price polling (HEB, Costco, Amazon Business APIs)
- Autonomous low-stock reorder triggers (email + purchase order generation)
- Predictive cost forecasting using seasonal pricing data

---

## 5. Adjacent Business Opportunities

Leverage the battle-tested platform built for Kynda:

- **Coffee Tech SaaS** – White-label version of admin tools (inventory, KDS, loyalty, marketing automation) sold to other independent cafés.
- **B2B Marketplace** – Wholesale coffee + merch portal with tiered pricing and bulk ordering.
- **Private-Label Merch Expansion** – Expand Printful + Design Studio into full custom corporate swag + branded retail lines.
- **Data Insights Service** – Sell anonymized foot-traffic, loyalty, and menu performance insights to CPG brands and equipment vendors.
- **Events & Experiences Platform** – QR-based pop-up ordering + loyalty for festivals, corporate events, and coffee cuppings.

---

## Working Rules for Phase 2

- Every feature must pass `npm run build` before push
- Conventional commits only
- Maintain charcoal/grey + rust design language
- POS-agnostic (Square for café, Printful/Stripe for merch & subscriptions)
- All new admin surfaces follow the established dashboard pattern
- Autonomous git push from local workstation after successful build

---

*This document supersedes any previous roadmap fragments. All future work is tracked against the prioritized list above.*