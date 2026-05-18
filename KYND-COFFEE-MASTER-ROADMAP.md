# Kynda Coffee Master Plan & Roadmap

**Last Updated:** 2026-06-11  
**Current Status:** Square image pipeline, customer order surfaces, and core admin dashboards hardened for production ordering. Starting **Subscription & Recurring Orders Engine**.

---

## Completed (Production Ready)

### Public-Facing Experience
- Full e-commerce hub (menu, shop, Design Studio, cart, checkout)
- Square catalog sync + centralized ProductImage component with resilient Square image-id extraction and branded fallbacks
- Printful merch integration + design-to-printful workflow
- **Loyalty Point Redemption** — fully working at checkout (100 pts = $5, real-time balance)
- **Real Email Automation** — centralized service + professional templates + admin triggers for abandoned cart, win-back, review requests, order & shipping notifications
- Clean modern Modern Artisan (bronze + forest) design language (mobile-first)

### Operations & Admin Tools
- Inventory Management backed by live Square/online stock data with low-stock visibility
- Customers CRM + Loyalty backed by profiles/orders (points, tiers, LTV)
- B2B / Wholesale Portal with tiered pricing
- Kitchen Display System (KDS) backed by active QR/pickup orders with live status transitions
- Unified Orders dashboard (café + merch)
- Analytics with café vs merch revenue splitting
- Staff Training and Scheduling
- Notifications backed by live order, low-stock, and subscription alerts
- Promo Codes + Gift Cards systems
- Products management page backed by live Square/online product data and image-missing filters
- Affiliates dashboard backed by live referral codes, referral events, and payout ledger
- Admin Subscriptions dashboard backed by live subscription/customer/product data with pause/resume/cancel ledger updates

- **Design System:** All pages must follow the Modern Artisan palette, typography, and component rules defined in `DESIGN.md`.
- Preserve and evolve the `DESIGN.md` schema as living source of truth
---
---

## In Progress — Next Focus

**Subscription & Recurring Orders Engine** (Priority #1)
- Customer-facing subscription options (recurring coffee boxes, office deliveries)
- Backend subscription management (pause, resume, cancel)
- Integration with existing B2B portal and checkout
- Subscription product type support

---

## Remaining Roadmap (Prioritized)

**High Impact**
- Marketing Campaign Execution (full scheduler + segmentation)

**Scalability**
- AI Insights Dashboard (`/admin/insights`)
- Predictive Staffing
- Inventory Forecasting & Auto-Reorder

**Customer Experience**
- Customer Account & Order Tracking Portal
- Enhanced Admin Settings

---

## Working Rules
- Always update this roadmap after major completions
- Build real, usable features
- `npm run build`, conventional commit, push after significant work
- Preserve Modern Artisan (bronze + forest) design language
- POS-agnostic (Square for café, Printful for merch)