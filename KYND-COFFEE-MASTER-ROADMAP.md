# Kynda Coffee Master Plan & Roadmap

**Last Updated:** 2026-06-11  
**Current Status:** Loyalty Redemption + Email Automation delivered. Starting **Subscription & Recurring Orders Engine**.

---

## Completed (Production Ready)

### Public-Facing Experience
- Full e-commerce hub (menu, shop, Design Studio, cart, checkout)
- Square catalog sync + centralized ProductImage component
- Printful merch integration + design-to-printful workflow
- **Loyalty Point Redemption** — fully working at checkout (100 pts = $5, real-time balance)
- **Real Email Automation** — centralized service + professional templates + admin triggers for abandoned cart, win-back, review requests, order & shipping notifications
- Clean modern charcoal/grey + rust design language (mobile-first)

### Operations & Admin Tools
- Inventory Management with low-stock alerts
- Customers CRM + Loyalty (points, tiers, LTV, notes)
- B2B / Wholesale Portal with tiered pricing
- Kitchen Display System (KDS)
- Unified Orders dashboard (café + merch)
- Analytics with café vs merch revenue splitting
- Staff Training, Scheduling, Notifications
- Promo Codes + Gift Cards systems
- Products management page

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
- Preserve charcoal/grey + rust design language
- POS-agnostic (Square for café, Printful for merch)