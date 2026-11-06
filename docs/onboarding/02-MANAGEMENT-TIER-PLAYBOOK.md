# Kynda Command & Control — Management & Team Lead Playbook
**For:** Store Managers & Shift Leads  
**Role Tier:** `Manager / Team Lead` (Tier 2 Leadership)  
**Primary Hubs:** `https://kyndacoffee.com/admin/kaizen` · `https://kyndacoffee.com/admin/command-center` · `https://kyndacoffee.com/staff/copilot`

---

## 1. Your Role in Kynda’s Kaizen System

As a Manager or Shift Lead at Kynda Coffee, you are the bridge between **frontline baristas** and **Jonathan & Briseida (Owners)**.

Our new **Kynda Command & Control (Kaizen RSI)** system is designed to eliminate busywork, replace scattered paper logs and GroupMe threads, and turn every shift improvement into a permanent upgrade for the shop.

### What You Have Access To (And Your Guardrails)
- **Full Operational Visibility:** You can view store vitals, KDS orders, checklist completion logs, waste reports, inventory par counts, equipment tickets, morning espresso dial-ins, predictive schedule surge forecasts, and team Kaizen proposals.
- **Shop Micro-Spend & AI Quota:** Your profile includes a dedicated **$15/mo AI Co-Pilot compute quota** and a **$150/mo shop micro-spend allowance** (with automatic approval for urgent shop supply runs up to **$100**, such as emergency ice, milk, or a replacement gasket; anything larger automatically queues for Jonathan & Brie).
- **Built-In Safety Rails:** You never have to worry about accidentally breaking pricing, live website menus, or public social media accounts—menu price edits, live social publishing, official SOP compilations, and large vendor POs always stop at **Jonathan & Brie’s Approval Gate** first.

---

## 2. Where & When to Interact With the System

### A. Before / Start of Shift (3 Minutes)
1. **Open `/staff/copilot` (Staff Co-Pilot & Kaizen Hub):**
   - Tap **"Play 60s Shift Brief"** to hear (or read) today’s active specials, espresso dial-in status, checklist status, and any open equipment alerts.
   - Verify that the opening barista has logged the **Morning Espresso Dial-In** (e.g., *"House Espresso 18.5g in, 37g out in 29s"*).
   - **Enforce Standing Rule #1:** Remind the team that **an unfinished opening checklist NEVER blocks serving guests**. Guests come first; checklists are completed around service.

### B. During the Shift (Real-Time Ops)
1. **Equipment Issues (`/staff/copilot` → Equipment Issue tab AND `/admin/chat`):**
   - **Enforce Standing Rule #2:** Equipment problems go to **Team Leadership + Team Chat** (and the Equipment Ticket queue)—**NEVER the Waste Log**.
   - When a barista reports an equipment issue, open `/admin/kaizen` → **Loss/Shrinkage & Dial-In Telemetry** tab to track the ticket and click **Mark Resolved** once fixed.
2. **Food, Drink & Item Waste (`/staff/waste-log`):**
   - **Enforce Standing Rule #3:** Make sure all spoiled milk, expired pastries, dropped cups, or remade drinks are logged in `/staff/waste-log`. Our ordering engine uses `order = par − on_hand + 7d_waste`, so accurate waste logging keeps the shop from running out of stock!
3. **Marketing Content Drops (`/admin/marketing/media-drop`):**
   - Encourage baristas to snap 1–2 great photos or 10-second vertical clips of latte pours, seasonal drinks, or happy patio moments and drop them into Media Drop. The AI drafts the captions and shorts automatically for Jonathan & Brie to approve.

### C. Mid-Week / Weekly Leadership Routine (15 Minutes)
1. **Predictive Schedule & Surge Planning (`/admin/kaizen` → Predictive Schedule & Surge tab):**
   - Before building or adjusting shifts in **Square**, check the **Surge Forecaster** in `/admin/kaizen`.
   - It calculates the expected demand multiplier (factoring in Horseshoe Bay weekend traffic, lake/holiday surges, and weather temperature/rain), recommends exact barista headcounts for **Morning Rush (7am–11am)**, **Midday Flow (11am–2pm)**, and **Afternoon/Close (2pm–5pm)**, and shows your **28% Target Labor Budget**.
2. **Par Counts → Weekly HEB & Monthly Amazon Orders (`/staff/par-counts` & `/admin/ingredients`):**
   - Have the designated shift lead/barista enter on-hand counts in `/staff/par-counts` (tabs for **HEB** and **Amazon**).
   - Open `/admin/ingredients` to review the auto-computed reorder quantities and flag the draft Purchase Order for Jonathan & Brie.
3. **Audit Checklists & Training (`/admin/checklists` & `/admin/team-ops`):**
   - Check `/admin/checklists` to see completion history by team member and shift type (Opening / Mid-Shift / Closing).
   - Check `/admin/team-ops` → **Hire Progress** to ensure new hires have finished **Module 0: Kynda Co-Pilot & Kaizen Quickstart** and uploaded their onboarding docs.
4. **Champion Team Kaizen Ideas (`/admin/kaizen` → Kaizen RSI Gate):**
   - When a barista has a smart idea during a shift, tell them: *"Put that in `/staff/copilot` under Kaizen Idea!"*
   - They earn **+25 XP immediately** and a **$5–$50 Kaizen Bounty** when Jonathan & Brie approve and compile it into our SOPs.
   - You can also submit your own Manager-level Kaizen proposals for workflow layouts, seasonal menu ideas, or cost savings!

---

## 3. Quick Reference: All Manager Actions & Where They Live

| Action | Where to Go | Who Finalizes? |
| :--- | :--- | :--- |
| **Listen to 60s Shift Brief / Log Dial-In** | `/staff/copilot` | Instant (+15 XP) |
| **Report or Resolve Equipment Issue** | `/staff/copilot` (submit) · `/admin/kaizen` (resolve) | Manager / Lead |
| **Submit a Kaizen Improvement Idea** | `/staff/copilot` (Kaizen Idea pill) | Jonathan & Brie approve (+$5–$50 bounty) |
| **Check 3-Day Staffing & Weather Surge** | `/admin/kaizen` → *Predictive Schedule & Surge* | Manager drafts in Square; Owners review |
| **Check Vendor Delivery ETAs / Event Requests** | `/admin/kaizen` → *5-Tier Budgets & Vendor Line* | Manager acknowledges; Owners approve price/events |
| **Audit Shift Checklists** | `/admin/checklists` | Manager / Lead |
| **Update Recipes or How-To Cleaning Guides** | `/admin/recipes` & `/admin/how-to` | Manager drafts; Owners approve canonical SOPs |
| **Run Weekly Par Count & Suggest Order** | `/staff/par-counts` → `/admin/ingredients` | Manager prepares; Jonathan & Brie submit order |
| **Upload Shift Photos / Videos for Social** | `/admin/marketing/media-drop` | Jonathan & Brie approve in `/admin/marketing/approvals` |
| **Private Message to Jonathan & Brie** | `/staff/copilot` → *🔒 Owner Whisper* | Strictly private to Jonathan & Brie |
