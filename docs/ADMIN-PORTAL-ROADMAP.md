# Admin Portal Audit & Build Roadmap

**Created:** 2026-07-06  
**Purpose:** Identify incomplete/templated admin pages and plan remaining features

---

## 1. Featured Items Management — FIXED (2026-07-06)

**Status:** ✅ Resolved in commit `f7a29f6`

**Problem:** The Featured toggle on `/admin/catalog` (POS Catalog page) appeared to not save — toggling it and refreshing reverted changes. Two root causes:

1. **No auto-save:** The Featured/Hidden toggle buttons only updated local React state. Saving required clicking a separate per-row "Save" button that was easy to miss.
2. **is_featured override never reached the storefront:** Even when saved to `catalog_overrides`, the `is_featured` column was never read by the product pipeline. `mapPosCatalogItemToProduct()` hardcoded `is_featured` based on a `itemType === "merch" || availableShipping` heuristic, completely ignoring the owner override. The homepage Featured Products section and the Menu Specials carousel were driven by this heuristic, not by admin toggles.

**Fix applied:**
- `PosCatalogRow` now carries `is_featured`; `applyCatalogOverrides()` propagates `override.is_featured` onto the row
- `mapPosCatalogRows()` exposes `isFeatured` on each `PosCatalogItem`
- `mapPosCatalogItemToProduct()` uses `item.isFeatured` from the override instead of the hardcoded heuristic
- MenuSpecials carousel now prioritizes items with `isFeatured` set via admin override, topping up with heuristic-scored items
- Admin catalog page Featured + Hidden toggles now auto-save on click via `updateAndSave()`
- Tests verify `is_featured` propagation through to Product and default `false` when no override sets it

**How to manage Featured items now:** Go to `/admin/catalog` → toggle the star button on any item → it saves automatically and appears on the homepage Featured Products section and the Menu Specials carousel.

---

## 2. Admin Page Audit Summary

All ~35 admin pages were reviewed. Most are more functional than expected — the initial build-out was substantial. Here's the classification:

### ✅ FUNCTIONAL (Real data, real CRUD, real business logic)

| Page | Path | Notes |
|------|------|-------|
| Dashboard | `/admin` | Revenue stats, 7-day growth, quick links |
| KDS | `/admin/kds` | Kitchen display with live order routing, snooze, alerts |
| Orders | `/admin/orders` | Order list with filters, detail view with modifiers/payment |
| Order History | `/admin/orders/history` | Date-range search of past orders |
| Order Detail | `/admin/orders/[id]` | Full order breakdown, POS/QR/agent item shapes |
| Products | `/admin/products` | Product list, edit, new, delete with images |
| Product Edit | `/admin/products/[id]/edit` | Full product editor with featured toggle |
| Product New | `/admin/products/new` | Create new products |
| POS Catalog | `/admin/catalog` | Override management (now with auto-save Featured toggle) |
| Customers | `/admin/customers` | Customer list, order history, loyalty points |
| Team & Access | `/admin/team` | Team members, roles, email invites |
| Analytics | `/admin/analytics` | Revenue charts, top products, growth trends |
| Designs | `/admin/designs` | AI design review and publishing |
| Square Sync | `/admin/square` | POS catalog/inventory/order sync |
| Image Sync | `/admin/image-sync` | Supabase Storage image management |
| QR Tables | `/admin/qr-tables` | QR code generation and table management |
| Gift Cards | `/admin/gift-cards` | Gift card management with Stripe payment integrity |
| Promo Codes | `/admin/promo-codes` | Promo code CRUD with usage tracking |
| Inbox | `/admin/inbox` | Contact/catering/application triage |
| Settings | `/admin/settings` | Store config, shipping, pickup hours |
| Site Map | `/admin/sitemap` | Route legend for all pages |
| Data Export | `/admin/data-export` | CSV/JSON export of any table |
| Notifications | `/admin/notifications` | Low-stock and reorder alerts |
| Insights | `/admin/insights` | Growth recommendations from sales/marketing/ops signals |
| Subscriptions | `/admin/subscriptions` | Coffee Club subscription management |
| Specials | `/admin/specials` | Time-limited special offer management |
| Schedule | `/admin/schedule` | Shift scheduling and time-off requests |
| Marketing Hub | `/admin/marketing` | Marketing overview with quick actions |
| Marketing Dashboard | `/admin/marketing/dashboard` | Unified marketing command center |
| Marketing AI Chat | `/admin/marketing/chat` | Claude-powered marketing assistant |
| Marketing Images | `/admin/marketing/images` | Image library with platform processing |
| Marketing Social | `/admin/marketing/social` | Multi-platform post management |
| Marketing Approvals | `/admin/marketing/approvals` | Owner approval queue for agent-drafted posts |
| Marketing Content Drop | `/admin/marketing/content-drop` | Product/feature image → platform drafts |
| Marketing Media Drop | `/admin/marketing/media-drop` | Raw media ingestion (photos + videos) |
| Marketing Validator | `/admin/marketing/validator` | X algorithm score + feedback |
| Newsletters | `/admin/newsletters` | Newsletter automation: draft, edit, approve, send |
| B2B / Wholesale | `/admin/b2b` | Wholesale lead management and pricing |
| Pricing Rules | `/admin/pricing` | Dynamic pricing rules (happy hour, bulk discounts) |

### ⚠️ PARTIAL (Functional but with significant gaps)

| Page | Path | What's Missing |
|------|------|----------------|
| Inventory | `/admin/inventory` | Shows Square stock levels + low-stock alerts, but **no par counting log** for monthly inventory counts. Needs: count sheets, variance tracking, count history, par-level management. |
| Training | `/admin/training` | Has training module listing, progress tracking, and admin overview, but depends on `training_modules` table having data. **No admin CRUD UI** for creating/editing modules — content must be inserted via SQL. Needs: module editor, quiz builder, video upload. |
| Careers | `/admin/careers` | Job application pipeline works (applications flow from contact form), but **no job posting management** — can't create/edit job listings from admin. Needs: job posting CRUD, application status workflow. |
| Affiliates | `/admin/affiliates` | Affiliate listing with stats, but depends on data existing. **No referral link generation** or affiliate onboarding flow. Needs: affiliate signup, link generation, payout tracking. |

### 🔧 STUB / NEEDS BUILDING (Doesn't exist yet)

| Feature | Status | Description |
|---------|--------|-------------|
| **Team Chat** | ❌ Not started | GroupMe-style team communication: channels, DMs, image sharing, owner announcements. All within the Kynda platform. |
| **Team Media Upload** | ❌ Not started | Any team member can upload photos/videos of food/drinks/shop/events → curated → marketing pipeline → social posting. |
| **Inventory Par Counting** | ❌ Not started | Monthly inventory count sheets: generate count sheet → team counts items → variance report → cost analysis. |
| **AI Business CEO/Strategist** | ❌ Not started | AI assistant with full company data access for strategic guidance. Could be: (a) Hermes Agent Skill with business context pool, (b) integrated admin page, or (c) hybrid. |
| **Training Module Builder** | ❌ Not started | Admin UI for creating/editing training modules, quizzes, and video content. |
| **Job Posting Management** | ❌ Not started | Admin CRUD for job listings on the careers page. |

---

## 3. Build Roadmap — New Features

### Phase A: Team Communication & Media (High Priority)

#### A1. Team Chat (`/admin/chat`)
**Effort:** 8-12 hours  
**Goal:** Replace GroupMe with an in-platform team chat

Features:
- Real-time channels (general, kitchen, front-of-house, management)
- Direct messages between team members
- Image/photo sharing (drag-drop, paste from clipboard)
- Owner announcements (pinned, read receipts)
- Message search and history
- Mobile-optimized (tablet + phone browser)
- Push notification integration (optional, via Twilio SMS for urgent)

**Schema:**
```sql
CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'channel', -- 'channel' | 'dm'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  body TEXT,
  image_url TEXT,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_channel_members (
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);
```

**Files to create:**
- `src/app/admin/chat/page.tsx` — main chat interface
- `src/app/api/admin/chat/messages/route.ts` — GET/POST messages
- `src/app/api/admin/chat/channels/route.ts` — channel CRUD
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/MessageInput.tsx`
- `src/components/chat/ChannelList.tsx`

#### A2. Team Media Upload (`/admin/media`)
**Effort:** 4-6 hours  
**Goal:** Team members upload photos/videos → curation → marketing pipeline

Features:
- Drag-drop or click upload (images + short videos)
- Auto-upload to Supabase Storage with optimization
- Tag uploads (product, event, shop, food, drink)
- Curation queue: owner/manager reviews → approves → sends to marketing image library
- Optional: AI auto-tagging and quality scoring

**Schema:**
```sql
CREATE TABLE team_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES auth.users(id),
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL, -- 'image' | 'video'
  tags TEXT[],
  status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase B: Inventory Par Counting (High Priority)

#### B1. Monthly Inventory Count System
**Effort:** 6-8 hours  
**Goal:** Take monthly inventory counts, track variance, calculate cost of goods

Features:
- Generate count sheet from current POS items (name, SKU, unit)
- Team member walks the shop counting items → enters counts on tablet
- Save incomplete count → resume later
- On finalize: compare counted vs system stock → variance report
- Cost of goods calculation (variance × unit cost)
- Count history with date, counter name, total variance
- Export to CSV for accounting

**Schema:**
```sql
CREATE TABLE inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  counted_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'in_progress', -- 'in_progress' | 'completed'
  total_variance_cents INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE inventory_count_items (
  count_id UUID REFERENCES inventory_counts(id) ON DELETE CASCADE,
  pos_item_id TEXT,
  name TEXT NOT NULL,
  system_stock INTEGER,
  counted_stock INTEGER,
  unit_cost_cents INTEGER,
  variance INTEGER GENERATED ALWAYS AS (counted_stock - system_stock) STORED,
  PRIMARY KEY (count_id, pos_item_id)
);
```

**Files to create:**
- `src/app/admin/inventory/count/page.tsx` — active count sheet
- `src/app/admin/inventory/counts/page.tsx` — count history
- `src/app/api/admin/inventory/counts/route.ts` — CRUD for counts
- `src/components/admin/CountSheet.tsx`

### Phase C: Training Module Builder (Medium Priority)

#### C1. Admin Training Module CRUD
**Effort:** 4-6 hours  
**Goal:** Create and edit training modules from the admin portal

Features:
- Module list with edit/delete
- Rich text editor for module content (markdown)
- Video URL field (YouTube, Vimeo, or direct upload)
- Quiz builder: add questions, multiple choice answers, correct answer
- Reorder modules within a category
- Set required vs optional
- Preview module as staff would see it

### Phase D: Job Posting Management (Medium Priority)

#### D1. Careers Admin CRUD
**Effort:** 2-3 hours  
**Goal:** Create/edit/delete job postings from admin

Features:
- Job posting list with status (open/closed/draft)
- Editor: title, description, requirements, schedule, pay range
- Auto-expire postings on end date
- Link to applications received for that role

### Phase E: AI Business CEO/Strategist (Strategic)

#### E1. AI CEO — Architecture Decision
**Effort:** Varies by approach (see options below)  
**Goal:** AI assistant with full company data access for strategic guidance

**Three implementation options:**

**Option A — Hermes Agent Skill (Lightest, 2-4 hours)**
- Create a Hermes skill with business context (revenue data, customer metrics, inventory, marketing performance)
- Owner triggers manually from Hermes CLI or Telegram
- Agent queries Supabase via API, analyzes trends, gives strategic recommendations
- Pros: No app code needed, leverages existing Hermes infrastructure, low cost (only runs when invoked)
- Cons: Not integrated into admin UI, requires Hermes session to use

**Option B — Integrated Admin Page (Medium, 8-12 hours)**
- New `/admin/strategist` page with chat interface
- Backend agent has access to: sales data, customer LTV, inventory levels, marketing ROI, staff schedules, P&L
- Uses Claude/GPT with tool-calling to query Supabase on demand
- Conversation history saved per session
- Pros: Fully integrated, accessible from any browser, team can use it
- Cons: API costs per conversation, more code to maintain

**Option C — Hybrid (Recommended, 10-14 hours)**
- Hermes skill for ad-hoc strategic analysis (triggered from CLI/Telegram)
- Admin page for team-facing strategic dashboard with AI chat
- Shared context pool: both read from the same business knowledge base
- Cron job (optional and configurable): weekly strategic brief — AI analyzes the week and sends a summary to owner
- Pros: Best of both worlds, owner can use CLI for deep analysis, team uses admin for quick questions
- Cons: Most upfront effort

**Recommended context pool data sources:**
- Revenue: daily/weekly/monthly from orders table
- Customers: LTV, acquisition channel, repeat rate
- Inventory: stock levels, variance, cost of goods
- Marketing: post performance, engagement, follower growth
- Staff: labor cost, schedule coverage, training completion
- Operations: order volume by channel, peak hours, average ticket

**Suggested trigger modes:**
- **Manual** (default): Owner kicks off from admin page or Hermes CLI
- **Weekly cron**: Every Monday 8am, AI reviews last week and sends strategic brief
- **Alert-based**: Triggered by threshold events (e.g., revenue drop >20%, stockout risk, staff scheduling gap)

### Phase F: Polish & Simplification (Low Priority)

#### F1. Admin Page Simplifications
- **Mobile nav**: The bottom mobile nav bar has 30+ items — consider grouping into expandable categories
- **Page consistency**: Some pages use `"use client"` with fetch, others use server components. Consider standardizing.
- **Empty states**: Several pages show blank loading states when no data exists — add helpful empty-state guidance
- **Search**: Add global search across admin pages (find any order, customer, product, or page from one bar)

---

## 4. Priority Order

1. ✅ **Featured items fix** — DONE (2026-07-06)
2. **Inventory par counting** (Phase B) — High impact, monthly operational need
3. **Team chat** (Phase A1) — Replaces GroupMe, keeps everything in-platform
4. **Team media upload** (Phase A2) — Feeds marketing pipeline, enables team participation
5. **Training module builder** (Phase C) — Completes the training system
6. **Job posting management** (Phase D) — Quick win, completes careers pipeline
7. **AI Business CEO** (Phase E) — Strategic, but can start with Option A (Hermes skill) for quick value
8. **Polish** (Phase F) — After core features are built
