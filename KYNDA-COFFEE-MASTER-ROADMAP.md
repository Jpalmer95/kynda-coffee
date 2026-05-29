# Kynda Coffee Platform — Master Implementation Roadmap

**Last Updated:** 2026-05-29 16:30  
**Status:** Phase 2 Complete, Starting Phase 3  
**Total Pages:** 69 (17 admin, 52 customer/staff)

---

## Table of Contents

1. [Current Status](#current-status)
2. [Architecture Overview](#architecture-overview)
3. [Phase 2: Design Studio Completion](#phase-2-design-studio-completion)
4. [Phase 3: Customer Ordering Experience](#phase-3-customer-ordering-experience)
5. [Phase 4: Staff Portal](#phase-4-staff-portal)
6. [Phase 5: Admin AI Marketing System](#phase-5-admin-ai-marketing-system)
7. [Phase 6: PWA & Offline Polish](#phase-6-pwa--offline-polish)
8. [Phase 7: Content & Marketing Pages](#phase-7-content--marketing-pages)
9. [Technical Debt & Refactoring](#technical-debt--refactoring)
10. [Platform Agnosticism Goals](#platform-agnosticism-goals)
11. [Performance & Security](#performance--security)
12. [Accessibility Compliance](#accessibility-compliance)

---

## Current Status

### ✅ Completed

**Design System v2 (2026-05-29)**
- [x] Modern Artisan color palette (Heirloom Cream + Charcoal)
- [x] EB Garamond + Plus Jakarta Sans typography
- [x] Full WCAG 2.2 AA compliance in both light/dark modes
- [x] Semantic Tailwind tokens with legacy compatibility
- [x] Theme toggle (light/dark/system) working

**Design Studio — Phase 1 (2026-05-29)**
- [x] Expanded Printful product catalog (11 products, 5 categories)
- [x] Variant selector (size/color/model)
- [x] Preset designs gallery with trending/seasonal filters
- [x] Kynda logo quick-add button
- [x] Canvas with drag/resize/rotate/transformer
- [x] Text layers with color picker
- [x] Front/back product views
- [x] Real-time pricing with markup + shipping buffer
- [x] `/api/printful/estimate` shipping cost API
- [x] Imperative canvas ref API (addLayerFromUrl, clearLayers)

**Existing Infrastructure**
- [x] Supabase auth + database (self-hosted on Coolify)
- [x] Square POS integration (orders, inventory, catalog)
- [x] Stripe checkout + webhooks
- [x] Printful client scaffolding
- [x] Loyalty points system (1 pt/$1, redemption)
- [x] Coffee subscriptions (Stripe recurring)
- [x] Admin dashboard (17 pages: orders, products, customers, inventory, KDS, etc.)
- [x] Customer account (orders, rewards, subscriptions, addresses)
- [x] Menu page with POS catalog sync
- [x] Blog + Gallery pages
- [x] Legal pages (terms, privacy, accessibility)

### 🚧 In Progress

**Design Studio — Phase 2 (2026-05-29)**
- [x] Save/load designs to Supabase (user account) — autosave + thumbnails + RLS
- [x] End-to-end Printful order submission — draft → confirm on payment → webhook tracking + /shop/merch/checkout
- [x] Content moderation API — OpenAI Moderation (text) + GPT-4o vision (canvas images), gating Generate and Add to Cart
- [x] Real mockup images — Supabase Storage bucket, admin sync route, DesignCanvas fallback to product image
- [x] Profitability guardrails — margin check (>$1/item) before Add to Cart, PRODUCT_MARKUP tiered multipliers

**Menu Ordering — Phase 3 (2026-05-29)**
- [x] Menu search bar + category filters
- [x] Dietary filters (vegan, gluten-free, dairy-free)
- [x] Menu specials section (highlight featured items)
- [x] Kiosk mode (/kiosk - tablet-optimized, Square-only payment)
- [x] "Build Your Own" custom drink builder
- [x] QR table ordering (/order?table=X)
- [x] Fulfillment mode selector (pickup/curbside/to-go/delivery)
- [x] Curbside vehicle description input (mandatory when mode = pickup)
- [x] Delivery platform links (DoorDash/Uber Eats buttons)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Coolify (VPS)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Next.js 16  │  │   Supabase   │  │    nginx     │       │
│  │   (Kynda)    │  │  (PostgreSQL │  │   (reverse   │       │
│  │              │  │   + Auth)    │  │    proxy)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              External Services                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Square  │  │  Stripe  │  │ Printful │  │   FAL    │    │
│  │   POS    │  │ Payments │  │    POD   │  │    AI    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Key Principles:**
1. **Platform Agnostic** — Square integration is modular; can swap for Toast/other POS
2. **Data Ownership** — All customer/order data lives in self-hosted Supabase
3. **Offline-First** — PWA with service worker for flaky connectivity
4. **Mobile-First** — Designed for phone/tablet/vehicle browser ordering

---

## Phase 2: Design Studio Completion

**Goal:** Production-ready custom merch ordering with Printful dropshipping

### 2.1 Design Persistence

**Priority:** High  
**Effort:** 4-6 hours

- [ ] Create `saved_designs` table in Supabase
  ```sql
  CREATE TABLE saved_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    product_id TEXT NOT NULL,
    variant_id INTEGER,
    name TEXT,
    layers JSONB NOT NULL, -- DesignLayer[]
    view TEXT DEFAULT 'front',
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX idx_saved_designs_user ON saved_designs(user_id);
  ```
- [ ] Add RLS policy: users can only read/write own designs
- [ ] Connect "Save Design" button in canvas to `/api/designs/save`
- [ ] Add "My Designs" tab in studio (loads saved designs)
- [ ] Auto-save after 30s inactivity (debounced)
- [ ] Generate thumbnail on save (canvas.toDataURL, upload to Supabase Storage)

**Files to Create/Modify:**
- `src/app/api/designs/save/route.ts` — POST create/update design
- `src/app/api/designs/route.ts` — GET all designs for user
- `src/app/api/designs/[id]/route.ts` — GET/PUT/DELETE single design
- `src/app/studio/page.tsx` — wire save/load UI

### 2.2 Printful End-to-End Integration

**Priority:** Critical  
**Effort:** 6-8 hours

- [ ] Create `/api/printful/create-order` POST route
  - Accepts: `recipient`, `items[]` (with variant_id, design_url), `retail_costs`
  - Calls Printful `/orders` endpoint with `confirm: false` (draft mode)
  - Returns: `{ printful_order_id, costs, preview_url }`
- [ ] Create `/api/printful/confirm-order` POST route
  - Takes `printful_order_id`, calls `/orders/{id}/confirm`
  - Only called after Stripe payment succeeds
- [ ] Update `/api/checkout` to detect `source === "design_studio"` items
  - Split cart: studio items → Printful, regular items → Stripe
  - Store `printful_order_id` on orders table
- [ ] Add Printful webhook handler
  - `package_shipped` → update order status, send shipping email
  - `order_failed` → alert admin, notify customer
- [ ] Create "Custom Merch Checkout" page (`/shop/merch/checkout`)
  - Address form (reuse existing component)
  - Shipping rate selector (from `/api/printful/estimate`)
  - Stripe checkout session creation
  - Success page with order summary

**Files to Create:**
- `src/app/api/printful/create-order/route.ts`
- `src/app/api/printful/confirm-order/route.ts`
- `src/app/api/webhooks/printful/route.ts`
- `src/app/shop/merch/checkout/page.tsx`
- `src/components/checkout/MerchCheckoutForm.tsx`

**Files to Modify:**
- `src/app/api/checkout/route.ts` — split studio vs regular items
- `src/app/api/webhooks/stripe/route.ts` — confirm Printful orders
- `src/app/studio/page.tsx` — redirect to merch checkout

### 2.3 Content Moderation

**Priority:** Medium  
**Effort:** 2-3 hours

- [ ] Integrate OpenAI Moderation API or AWS Rekognition
- [ ] Create `/api/designs/moderate` POST route
  - Accepts base64 image or URL
  - Returns `{ safe: boolean, categories: string[] }`
- [ ] Call moderation in `/api/designs/generate` before returning image
- [ ] Call moderation on canvas "Add to Cart" before proceeding
- [ ] Add "Report Design" button for admins (flags for manual review)
- [ ] Store moderation results in `saved_designs.moderation_status`

**Files to Create:**
- `src/lib/moderation/client.ts` — moderation API wrapper
- `src/app/api/designs/moderate/route.ts`

### 2.4 Real Mockup Images

**Priority:** Medium  
**Effort:** 3-4 hours

- [ ] Download/generate high-quality mockup images for all 11 products
  - Front + back views where applicable
  - Transparent PNG backgrounds for design overlay
  - Consistent lighting/angle
- [ ] Upload to Supabase Storage `mockups/` bucket
- [ ] Update `PRINTFUL_CATALOG` in `src/lib/printful/catalog.ts`
- [ ] Add mockup generator fallback (if image fails, show product photo)

**Tools:**
- Placeit API or Printful mockup generator
- Midjourney/Stable Diffusion for custom mockups
- Figma for consistent styling

---

## Phase 3: Customer Ordering Experience

**Goal:** Seamless multi-channel ordering (pickup, curbside, delivery, QR)

### 3.1 Fulfillment Mode Selector

**Priority:** High  
**Effort:** 4-5 hours

- [ ] Create `FulfillmentModeProvider` context
  - State: `mode` (pickup | curbside | to-go | delivery | qr)
  - Persist to localStorage
- [ ] Add mode selector to `/menu` page
  - Large radio buttons with icons
  - Show estimated times per mode
  - Disable modes not available (e.g., curbside after 9pm)
- [ ] Update cart store to include fulfillment mode
- [ ] Pass mode to `/api/orders/submit`

**UI Mockup:**
```
┌─────────────────────────────────────┐
│ How would you like to order?        │
├─────────────────────────────────────┤
│ ◉ Pickup (Ready in 15 min)          │
│   Pick up at counter                │
├─────────────────────────────────────┤
│ ○ Curbside (Ready in 20 min)        │
│   We'll bring it to your car        │
├─────────────────────────────────────┤
│ ○ To-Go (Ready now)                 │
│   Grab and go                       │
├─────────────────────────────────────┤
│ ○ Delivery                          │
│   DoorDash / Uber Eats              │
└─────────────────────────────────────┘
```

**Files to Create:**
- `src/lib/context/FulfillmentModeProvider.tsx`
- `src/components/order/FulfillmentModeSelector.tsx`

**Files to Modify:**
- `src/app/menu/page.tsx` — add selector
- `src/hooks/useCart.ts` — add fulfillment mode to store
- `src/app/api/orders/submit/route.ts` — accept mode

### 3.2 Curbside Vehicle Description

**Priority:** High  
**Effort:** 2-3 hours

- [ ] Add vehicle description input to cart (when mode === "curbside")
  - Placeholder: "Describe your vehicle (e.g., red Honda Civic)"
  - Required field, validation
- [ ] Store in cart: `vehicle_description: string`
- [ ] Pass to `/api/orders/submit` → orders table `notes` field
- [ ] Display on KDS screen (admin KDS page)
- [ ] Add to order confirmation email

**Files to Modify:**
- `src/app/shop/cart/page.tsx` — add vehicle input
- `src/app/order/page.tsx` — show vehicle on review
- `src/app/api/orders/submit/route.ts` — save vehicle
- `src/app/admin/kds/page.tsx` — display vehicle
- `src/lib/email/templates/order-confirmation.html` — include vehicle

### 3.3 Delivery Platform Links

**Priority:** Medium  
**Effort:** 1-2 hours

- [ ] Create delivery mode component
  - "Order for delivery on:"
  - DoorDash button (link to Kynda on DoorDash)
  - Uber Eats button (link to Kynda on Uber Eats)
  - "Coming soon: Direct delivery (we're working on it!)"
- [ ] Add to `/menu` page when mode === "delivery"
- [ ] Track clicks (analytics)

**Files to Create:**
- `src/components/order/DeliveryPlatforms.tsx`

**Files to Modify:**
- `src/app/menu/page.tsx` — render component

### 3.4 Kiosk Mode

**Priority:** Low  
**Effort:** 3-4 hours

- [ ] Create `/kiosk` route (tablet-optimized)
  - Full-screen menu browser
  - Simplified cart (no account required)
  - Square POS integration only (pay at counter)
  - "Call staff" button
- [ ] Add settings to admin
  - Enable/disable kiosk
  - Auto-refresh interval
  - Hide certain categories (e.g., merch)
- [ ] Test on iPad/Android tablet

**Files to Create:**
- `src/app/kiosk/page.tsx`
- `src/app/kiosk/layout.tsx` (no header/footer)
- `src/app/api/admin/settings/kiosk/route.ts`

### 3.5 QR Table Ordering

**Priority:** Medium  
**Effort:** 2-3 hours

- [ ] Update QR code generator in admin
  - QR code → `/order?table=12`
  - Each table gets unique QR
- [ ] Auto-detect table from URL param
  - Lock fulfillment mode to "pickup" (staff brings to table)
  - Pre-fill table number in order notes
- [ ] Add "Table Order" button to order review
  - Shows table number
  - "We'll bring your order to table 12"

**Files to Modify:**
- `src/app/qr-order/page.tsx` — read table param
- `src/app/order/page.tsx` — show table info
- `src/app/admin/settings/page.tsx` — QR generator

### 3.6 Menu Page Polish

**Priority:** High  
**Effort:** 6-8 hours

- [ ] Add search bar (filter by name/description)
- [ ] Add category filters (coffee, tea, food, etc.)
- [ ] Add dietary filters (vegan, gluten-free, etc.)
- [ ] Improve product cards
  - Larger images
  - "Popular" badge
  - Quick-add button
- [ ] Add "Specials" section (daily deals)
- [ ] Add "Build Your Own" section (custom drinks)
- [ ] Improve mobile layout (horizontal scroll for categories)

**Files to Modify:**
- `src/app/menu/page.tsx` — add filters, search
- `src/components/menu/ProductCard.tsx` — enhance
- `src/components/menu/CategoryFilter.tsx` — create
- `src/components/menu/DietaryFilter.tsx` — create

---

## Phase 4: Staff Portal

**Goal:** Barista-only section with training, recipes, checklists, waste tracking

### 4.1 Staff Authentication

**Priority:** High  
**Effort:** 3-4 hours

- [ ] Add `is_staff` boolean to `profiles` table
- [ ] Create staff invite flow
  - Admin invites via email (`/admin/staff/invite`)
  - User claims invite, sets password
  - Auto-assigns `is_staff: true`
- [ ] Add staff login redirect
  - If `is_staff`, redirect to `/staff/dashboard` instead of `/account`
- [ ] Protect `/staff/*` routes with middleware
  - Check `is_staff` in session
  - Redirect to login if not staff

**Files to Create:**
- `src/app/staff/layout.tsx` — staff-only layout
- `src/app/staff/dashboard/page.tsx` — staff home
- `src/app/api/admin/staff/invite/route.ts`
- `src/middleware.ts` — add staff route protection

**Files to Modify:**
- `supabase/migrations/20260529_add_is_staff.sql` — add column
- `src/app/api/auth/callback/route.ts` — staff redirect logic

### 4.2 Training Materials

**Priority:** High  
**Effort:** 4-5 hours

- [ ] Create `training_modules` table
  ```sql
  CREATE TABLE training_modules (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'espresso', 'food', 'customer-service', etc.
    content JSONB, -- markdown or rich text
    video_url TEXT,
    quiz JSONB, -- questions[]
    duration_minutes INTEGER,
    required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Create `training_progress` table
  ```sql
  CREATE TABLE training_progress (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    module_id UUID REFERENCES training_modules(id),
    status TEXT, -- 'not_started', 'in_progress', 'completed'
    quiz_score INTEGER,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Build `/staff/training` page
  - List all modules with progress
  - Filter by category
  - Show required vs optional
- [ ] Build `/staff/training/[moduleId]` page
  - Render markdown content
  - Video player (if provided)
  - Quiz at end (multiple choice)
  - "Mark as Complete" button
- [ ] Admin can create/edit modules (`/admin/training/modules`)

**Files to Create:**
- `src/app/staff/training/page.tsx`
- `src/app/staff/training/[moduleId]/page.tsx`
- `src/app/staff/training/components/Quiz.tsx`
- `src/app/api/staff/training/progress/route.ts`

### 4.3 Employee Handbook

**Priority:** Medium  
**Effort:** 3-4 hours

- [ ] Create `handbook_sections` table
  ```sql
  CREATE TABLE handbook_sections (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    content JSONB, -- rich text
    order_index INTEGER,
    last_updated TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Build `/staff/handbook` page
  - Sidebar navigation (sections)
  - Rich text renderer
  - Search functionality
- [ ] Admin can edit sections (`/admin/staff/handbook`)
- [ ] Show "Last Updated" date
- [ ] Add "Acknowledge" button (staff confirms they've read)

**Files to Create:**
- `src/app/staff/handbook/page.tsx`
- `src/app/staff/handbook/components/HandbookSidebar.tsx`
- `src/app/api/admin/staff/handbook/route.ts`

### 4.4 Recipes

**Priority:** High  
**Effort:** 4-5 hours

- [ ] Create `recipes` table
  ```sql
  CREATE TABLE recipes (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT, -- 'espresso', 'cold-brew', 'food', 'pastry'
    ingredients JSONB, -- [{ name, amount, unit }]
    steps JSONB, -- [{ order, instruction }]
    prep_time_minutes INTEGER,
    servings INTEGER,
    notes TEXT,
    image_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Build `/staff/recipes` page
  - Card grid with images
  - Filter by category
  - Search by name/ingredient
- [ ] Build `/staff/recipes/[id]` page
  - Ingredient list with units
  - Step-by-step instructions
  - Timer (if prep_time provided)
  - "Scale Recipe" (adjust servings, auto-calculate amounts)
- [ ] Admin can add/edit recipes (`/admin/staff/recipes`)

**Files to Create:**
- `src/app/staff/recipes/page.tsx`
- `src/app/staff/recipes/[id]/page.tsx`
- `src/app/staff/recipes/components/RecipeTimer.tsx`
- `src/app/staff/recipes/components/RecipeScaler.tsx`
- `src/app/api/admin/staff/recipes/route.ts`

### 4.5 Opening/Closing Checklists

**Priority:** High  
**Effort:** 3-4 hours

- [ ] Create `checklists` table
  ```sql
  CREATE TABLE checklists (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL, -- 'Opening', 'Closing', 'Mid-Shift'
    category TEXT,
    items JSONB, -- [{ id, text, required }]
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Create `checklist_completions` table
  ```sql
  CREATE TABLE checklist_completions (
    id UUID PRIMARY KEY,
    checklist_id UUID REFERENCES checklists(id),
    completed_by UUID REFERENCES auth.users(id),
    completed_items JSONB, -- [{ id, completed_at }]
    notes TEXT,
    completed_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Build `/staff/checklists` page
  - Show today's checklists
  - Checkbox list
  - Add notes per item
  - "Complete Checklist" button
  - View past completions
- [ ] Admin can edit checklists (`/admin/staff/checklists`)

**Files to Create:**
- `src/app/staff/checklists/page.tsx`
- `src/app/staff/checklists/components/ChecklistItem.tsx`
- `src/app/api/staff/checklists/complete/route.ts`
- `src/app/api/admin/staff/checklists/route.ts`

### 4.6 Waste Log

**Priority:** Medium  
**Effort:** 4-5 hours

- [ ] Create `waste_entries` table
  ```sql
  CREATE TABLE waste_entries (
    id UUID PRIMARY KEY,
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit TEXT NOT NULL, -- 'cups', 'lbs', 'each'
    reason TEXT NOT NULL, -- 'expired', 'spilled', 'customer-complaint', 'damaged'
    cost_cents INTEGER,
    reported_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Build `/staff/waste` page
  - "Log Waste" form
    - Product selector (from inventory)
    - Quantity + unit
    - Reason dropdown
    - Notes (optional)
  - Recent entries table
  - Filters: date range, reason, product
- [ ] Build `/admin/staff/waste/analytics` page
  - Waste by reason (pie chart)
  - Waste by product (bar chart)
  - Waste trend over time (line chart)
  - Total cost of waste (monthly)

**Files to Create:**
- `src/app/staff/waste/page.tsx`
- `src/app/staff/waste/components/WasteForm.tsx`
- `src/app/admin/staff/waste/analytics/page.tsx`
- `src/app/api/staff/waste/route.ts`

---

## Phase 5: Admin AI Marketing System

**Goal:** AI-powered marketing automation with chat interface + multi-platform posting

### 5.1 Marketing AI Chat Interface

**Priority:** High  
**Effort:** 6-8 hours

- [ ] Create `/admin/marketing/chat` page
  - Chat UI (like ChatGPT)
  - Sidebar with conversation history
  - "New Conversation" button
- [ ] Integrate with Claude/GPT-4 API
  - System prompt: "You are a marketing assistant for Kynda Coffee..."
  - Context: brand voice, target audience, past campaigns
- [ ] Add "Marketing Agent" tools
  - `generate_social_post(platform, topic)` → returns post text
  - `create_image_caption(image_url)` → returns alt text + caption
  - `suggest_hashtags(post_text)` → returns hashtag array
  - `schedule_post(platform, text, image_url, publish_at)` → queues post
- [ ] Add "Quick Actions" buttons
  - "Write Instagram post about [product]"
  - "Generate Twitter thread about [topic]"
  - "Create Facebook event announcement"

**Files to Create:**
- `src/app/admin/marketing/chat/page.tsx`
- `src/components/marketing/ChatInterface.tsx`
- `src/components/marketing/ChatMessage.tsx`
- `src/lib/marketing/agents/claude.ts` — Claude API wrapper
- `src/lib/marketing/tools/social-post.ts`
- `src/lib/marketing/tools/image-caption.ts`
- `src/lib/marketing/tools/scheduler.ts`

### 5.2 Image Processing Pipeline

**Priority:** High  
**Effort:** 4-6 hours

- [ ] Create image upload component
  - Drag-and-drop or file picker
  - Upload to Supabase Storage `marketing-images/`
  - Return URL
- [ ] Build `/admin/marketing/images` page
  - Grid of uploaded images
  - "Process Image" button on each
- [ ] Image processing pipeline
  - Auto-crop + resize for each platform (IG square, story, FB cover, etc.)
  - Add watermark (Kynda logo, subtle)
  - Generate alt text with Claude Vision
  - Suggest filters/edits (brightness, contrast, saturation)
- [ ] Add "Apply Edits" preview (before/after)
- [ ] Store processed versions in Storage

**Files to Create:**
- `src/app/admin/marketing/images/page.tsx`
- `src/components/marketing/ImageUploader.tsx`
- `src/components/marketing/ImageProcessor.tsx`
- `src/lib/marketing/image/resize.ts` — sharp or browser-canvas
- `src/lib/marketing/image/watermark.ts`
- `src/app/api/marketing/images/process/route.ts`

### 5.3 Multi-Platform Posting

**Priority:** Medium  
**Effort:** 8-10 hours

- [ ] Integrate social platform APIs
  - Instagram Graph API (Business account)
  - Twitter/X API v2
  - Facebook Pages API
  - (Optional: TikTok, Pinterest)
- [ ] Create `social_posts` table
  ```sql
  CREATE TABLE social_posts (
    id UUID PRIMARY KEY,
    platform TEXT NOT NULL, -- 'instagram', 'twitter', 'facebook'
    text TEXT NOT NULL,
    image_urls TEXT[], -- multiple images for carousel
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    external_id TEXT, -- platform's post ID
    status TEXT, -- 'draft', 'scheduled', 'published', 'failed'
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Build "Schedule Post" flow
  - Select platform(s)
  - Write text (or use AI suggestion)
  - Upload image(s)
  - Pick date/time
  - Preview post (platform-specific UI)
  - "Schedule" or "Publish Now"
- [ ] Create cron job to publish scheduled posts
  - Runs every 15 minutes
  - Publishes posts where `scheduled_at <= NOW()` AND `status = 'scheduled'`
  - Updates `status` and `published_at` on success
- [ ] Add "Scheduled Posts" calendar view (`/admin/marketing/schedule`)

**Files to Create:**
- `src/app/admin/marketing/schedule/page.tsx`
- `src/components/marketing/PostScheduler.tsx`
- `src/components/marketing/PlatformPreview.tsx`
- `src/lib/marketing/platforms/instagram.ts`
- `src/lib/marketing/platforms/twitter.ts`
- `src/lib/marketing/platforms/facebook.ts`
- `src/app/api/marketing/publish/route.ts` — cron handler

### 5.4 Analytics Dashboard

**Priority:** Low  
**Effort:** 4-5 hours

- [ ] Integrate platform analytics APIs
  - Instagram Insights
  - Twitter Analytics
  - Facebook Page Insights
- [ ] Build `/admin/marketing/analytics` page
  - Engagement metrics (likes, comments, shares)
  - Follower growth
  - Top-performing posts
  - Best posting times
- [ ] Add "AI Insights" section
  - "Your posts perform best on Tuesdays at 2pm"
  - "Posts with coffee imagery get 2x engagement"
  - "Consider posting more video content"

**Files to Create:**
- `src/app/admin/marketing/analytics/page.tsx`
- `src/components/marketing/AnalyticsCards.tsx`
- `src/lib/marketing/analytics/instagram.ts`
- `src/lib/marketing/analytics/twitter.ts`

---

## Phase 6: PWA & Offline Polish

**Goal:** Installable, offline-capable PWA that works in vehicle browsers

### 6.1 Service Worker

**Priority:** High  
**Effort:** 4-5 hours

- [ ] Create `public/sw.js` (or use Workbox)
  - Cache static assets (JS, CSS, images)
  - Cache menu data (refresh on load)
  - Cache user preferences (theme, cart)
  - Background sync for offline orders
- [ ] Register SW in `layout.tsx`
- [ ] Add offline fallback page (`/offline`)
- [ ] Test offline mode (DevTools → Offline)

**Tools:**
- Workbox (recommended) or vanilla SW

### 6.2 Install Prompt

**Priority:** Medium  
**Effort:** 2-3 hours

- [ ] Create `InstallPrompt` component
  - Listen for `beforeinstallprompt` event
  - Show banner: "Install Kynda Coffee for quick access"
  - "Install" button triggers prompt
  - Hide if already installed
- [ ] Add to `layout.tsx`

**Files to Create:**
- `src/components/pwa/InstallPrompt.tsx`

### 6.3 Offline Orders

**Priority:** Medium  
**Effort:** 3-4 hours

- [ ] Store cart in IndexedDB (not just localStorage)
- [ ] When offline + user submits order:
  - Save to IndexedDB `pending_orders`
  - Show "Order will be submitted when online"
- [ ] When back online:
  - Sync pending orders
  - Submit via `/api/orders/submit`
  - Show success/failure notification

### 6.4 Vehicle Browser Optimization

**Priority:** Low  
**Effort:** 2-3 hours

- [ ] Test on Apple CarPlay / Android Auto browsers
- [ ] Increase touch target sizes (min 60px)
- [ ] Increase font sizes (min 18px body)
- [ ] Simplify navigation (large buttons, fewer options)
- [ ] Add "Voice Order" button (future: integrate Siri/Google Assistant)

---

## Phase 7: Content & Marketing Pages

**Goal:** Complete customer-facing content pages

### 7.1 Careers Page

**Priority:** Medium  
**Effort:** 3-4 hours

- [ ] Create `/careers` page
  - "Join the Kynda Team" hero
  - Current openings (hardcoded or from `job_openings` table)
  - "Apply Now" form (name, email, resume upload, cover letter)
  - Applications stored in Supabase `job_applications`
- [ ] Admin can view applications (`/admin/careers/applications`)
- [ ] Admin can post new openings (`/admin/careers/openings`)

**Files to Create:**
- `src/app/careers/page.tsx`
- `src/app/careers/[slug]/page.tsx` (individual job post)
- `src/components/careers/ApplicationForm.tsx`
- `src/app/admin/careers/applications/page.tsx`
- `src/app/admin/careers/openings/page.tsx`
- `src/app/api/careers/apply/route.ts`

### 7.2 Location & Hours

**Priority:** High  
**Effort:** 3-4 hours

- [ ] Create `/location` page
  - Google Maps embed (or OpenStreetMap)
  - Address: Horseshoe Bay, TX
  - Hours table (with "Open Now" indicator)
  - Directions button (opens Google Maps app)
  - Photo gallery of storefront/interior
- [ ] Add "Find Us" link to header/footer

**Files to Create:**
- `src/app/location/page.tsx`
- `src/components/location/HoursTable.tsx`
- `src/components/location/MapEmbed.tsx`

### 7.3 FAQ Page

**Priority:** Low  
**Effort:** 2-3 hours

- [ ] Create `/faq` page
  - Accordion-style Q&A
  - Categories: ordering, shipping, returns, loyalty, etc.
  - Search bar
- [ ] Admin can add/edit FAQs (`/admin/content/faq`)

**Files to Create:**
- `src/app/faq/page.tsx`
- `src/app/admin/content/faq/page.tsx`

### 7.4 Catering Inquiry

**Priority:** Medium  
**Effort:** 2-3 hours

- [ ] Create `/catering` page
  - Hero: "Catering for Your Event"
  - Services offered (coffee bar, pastries, etc.)
  - Pricing guide
  - Inquiry form (event date, guest count, location, notes)
  - Submissions go to `catering_inquiries` table
- [ ] Admin can view inquiries (`/admin/catering`)

**Files to Create:**
- `src/app/catering/page.tsx` (may already exist — check)
- `src/app/admin/catering/page.tsx`
- `src/app/api/catering/inquire/route.ts`

---

## Technical Debt & Refactoring

### 8.1 Code Quality

- [ ] Add TypeScript strict mode (`strict: true` in tsconfig)
- [ ] Add ESLint rules (react-hooks, import, a11y)
- [ ] Add Prettier for formatting
- [ ] Add Husky pre-commit hooks (lint, type-check)
- [ ] Add unit tests (Vitest)
  - Utility functions
  - API routes
  - Cart store logic
- [ ] Add E2E tests (Playwright)
  - Critical user flows (add to cart, checkout, login)
- [ ] Fix all TypeScript warnings

### 8.2 Performance

- [ ] Add React Query or SWR for data fetching (cache, refetch, optimistic updates)
- [ ] Lazy-load heavy components (DesignCanvas, ImageEditor)
- [ ] Optimize images (Next.js Image, WebP, responsive sizes)
- [ ] Add route-level code splitting
- [ ] Measure Core Web Vitals (LCP, FID, CLS) and fix issues
- [ ] Add bundle analyzer (find large dependencies)

### 8.3 Security

- [ ] Add rate limiting to all POST routes
- [ ] Add CSRF protection
- [ ] Audit Supabase RLS policies (test with different user roles)
- [ ] Add input sanitization (prevent XSS)
- [ ] Add SQL injection tests
- [ ] Enable HSTS header
- [ ] Add Content Security Policy

### 8.4 Documentation

- [ ] Write API docs (OpenAPI spec)
- [ ] Write component Storybook (document UI components)
- [ ] Write deployment guide (how to deploy to new server)
- [ ] Write admin user guide (how to use each admin feature)
- [ ] Write staff handbook (for new baristas)

---

## Platform Agnosticism Goals

### 9.1 POS Abstraction Layer

**Goal:** Decouple from Square so we can switch to Toast/other POS

- [ ] Create `src/lib/pos/` directory
  - `types.ts` — POS-agnostic types (Product, Order, Customer)
  - `square-adapter.ts` — Square-specific implementation
  - `toast-adapter.ts` — Toast-specific implementation (future)
  - `index.ts` — factory function `getPOSAdapter()`
- [ ] Refactor existing Square code to use adapter
  - Replace direct Square API calls with `posAdapter.syncProducts()`
  - Replace Square-specific types with agnostic types
- [ ] Add "POS Provider" selector to admin settings
  - Currently: Square
  - Future: Toast, Clover, Square

**Files to Create:**
- `src/lib/pos/types.ts`
- `src/lib/pos/square-adapter.ts`
- `src/lib/pos/toast-adapter.ts` (stub)
- `src/lib/pos/index.ts`

**Files to Modify:**
- All files importing from `@/lib/square/` → use `getPOSAdapter()`

### 9.2 Payment Abstraction Layer

**Goal:** Support multiple payment processors (Stripe, Square, future: PayPal)

- [ ] Create `src/lib/payments/` directory
  - `types.ts` — payment-agnostic types
  - `stripe-adapter.ts` — Stripe implementation
  - `square-adapter.ts` — Square implementation
  - `index.ts` — factory
- [ ] Refactor checkout to use adapter
  - `createCheckoutSession()` abstracted
  - `handleWebhook()` abstracted

---

## Performance & Security

### 10.1 Performance Targets

- [ ] Lighthouse score ≥ 90 (performance, accessibility, best practices, SEO)
- [ ] LCP < 2.5s (Largest Contentful Paint)
- [ ] FID < 100ms (First Input Delay)
- [ ] CLS < 0.1 (Cumulative Layout Shift)
- [ ] TTFB < 600ms (Time to First Byte)

### 10.2 Monitoring

- [ ] Add Sentry for error tracking
- [ ] Add PostHog or Plausible for analytics (privacy-focused)
- [ ] Add uptime monitoring (UptimeRobot or Better Stack)
- [ ] Add database query monitoring (Supabase dashboard)
- [ ] Add API response time monitoring

---

## Accessibility Compliance

**Goal:** WCAG 2.2 AA compliance across all pages

### 11.1 Keyboard Navigation

- [ ] Test all pages with keyboard only (Tab, Shift+Tab, Enter, Space)
- [ ] Add skip links to main content
- [ ] Ensure focus indicators are visible
- [ ] Test with screen readers (NVDA, VoiceOver)

### 11.2 ARIA Labels

- [ ] Audit all interactive elements (buttons, links, inputs)
- [ ] Add `aria-label` where text is not visible
- [ ] Add `aria-describedby` for complex inputs
- [ ] Add `aria-live` regions for dynamic content (toasts, errors)

### 11.3 Color Contrast

- [x] Design system colors verified (WCAG AA)
- [ ] Audit all pages for contrast issues (especially gray text)
- [ ] Ensure error messages have sufficient contrast
- [ ] Test with browser contrast checker (Chrome DevTools)

### 11.4 Reduced Motion

- [x] Added `@media (prefers-reduced-motion: reduce)` to globals.css
- [ ] Test all animations respect reduced motion
- [ ] Add "Reduce Motion" toggle to accessibility settings

### 11.5 Form Accessibility

- [ ] All inputs have associated `<label>`
- [ ] Required fields marked with `aria-required="true"`
- [ ] Error messages use `aria-invalid` and `aria-describedby`
- [ ] Autocomplete attributes added where appropriate

---

## Summary

**Total Estimated Effort:** 120-150 hours

**Priority Order:**
1. **Phase 3** (Customer Ordering) — Most customer-facing impact
2. **Phase 2** (Design Studio) — Revenue-generating feature
3. **Phase 4** (Staff Portal) — Operational efficiency
4. **Phase 6** (PWA) — Mobile experience
5. **Phase 7** (Content Pages) — Complete website
6. **Phase 5** (Marketing AI) — Nice-to-have automation
7. **Technical Debt** — Ongoing maintenance

**Next Steps:**
1. Review this roadmap with user
2. Prioritize phases based on business needs
3. Break each phase into 1-week sprints
4. Start with Phase 3 (Customer Ordering)

---

**Document Maintenance:**
- Update this document after each major milestone
- Mark completed items with ✅
- Add new discoveries to "Technical Debt" section
- Adjust effort estimates as we learn more
