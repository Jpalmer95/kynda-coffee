# Kynda Command & Control (Kaizen RSI) — Co-Owners' Playbook
**For:** Jonathan & Briseida ("Brie") Korstad  
**Role Tier:** `Owner` (Tier 3 Root — Equal Authority & Sacred Approval Gate)  
**Primary Hub:** `https://kyndacoffee.com/admin/kaizen` & `https://kyndacoffee.com/admin/command-center`

---

## 1. Welcome to Your New Business Brain

You and Brie sit at the top of Kynda Coffee’s **Decentralized Kaizen RSI (Recursive Self-Improvement)** system with **equal root authority**.

Every person on the team—from a brand-new barista to a shift lead or manager—now has a direct, structured way to ask questions, log daily operations, and submit ideas to make the shop faster, cleaner, and more profitable.

**Your Golden Assurance as Owners:**
> **Nobody can change the trajectory, brand voice, menu prices, live recipes, official policies, or major spending of Kynda Coffee without your or Brie’s explicit click.**  
> Everyone else’s ideas and agent actions land in clean **Approval Queues** where you two have the final say.

---

## 2. Where You & Brie Go (Your Bookmarks)

Save these three links to your phone’s Home Screen or browser bookmarks:

| Surface | URL | When to Open It |
| :--- | :--- | :--- |
| **1. Kaizen & C2 Brain (Main Deck)** | `https://kyndacoffee.com/admin/kaizen` | **Daily (2–3 mins):** Approve/compile team Kaizen ideas, read private Owner Whispers, check the 3-day Surge Schedule forecast, and review Shrinkage/Equipment alerts. |
| **2. Command Center (Executive Pulse)** | `https://kyndacoffee.com/admin/command-center` | **Morning / Evening:** See today’s revenue, 7-day & 30-day growth, inbox counts, B2B leads, and pending Marketing approvals on one screen. |
| **3. Marketing Approval Gate** | `https://kyndacoffee.com/admin/marketing/approvals` | **2–3× per week:** One-tap Approve or Reject social posts and Reels/Shorts drafted from barista photo/video drops. |

*(Make sure both of your emails are listed in `ADMIN_EMAILS` in Coolify or set to `owner` in `/admin/team` so you both have full Root Owner access.)*

---

## 3. Complete Guide to the 6 Tabs in `/admin/kaizen`

### Tab 1: Kaizen RSI Gate (Turning Team Ideas into Permanent Upgrades)
Whenever a barista or manager spots a bottleneck or improvement and tells **Staff Co-Pilot** (`/staff/copilot`), the system scores its business impact (`0–100`), estimates monthly value, assigns a suggested **Kaizen Bounty ($5–$50)**, and queues it here.
- **Your 3 Options on Any Idea:**
  1. **Approve & Compile to SOP (+Pay Bounty):** Immediately adopts the idea, writes it into our live `/staff/how-to` SOP guides, awards the employee **+100 Kaizen XP**, and adds the bounty to their balance.
  2. **Run 14-Day Telemetry Trial:** Marks the idea active on a 2-week trial so you can verify whether it actually improves speed, sales, or waste before making it permanent.
  3. **Park for Later:** Saves the idea for the future (e.g., after the 4909 RM 2147 reopening) while thanking the submitter.

### Tab 2: 🔒 Owner Whispers (Strictly Jonathan & Brie Only)
- This is the team’s **confidential safety valve**.
- If a barista has a sensitive concern (safety, scheduling fairness, interpersonal friction, or something they only feel comfortable telling the owners), they submit an **Owner Whisper** (named or anonymous).
- **Privacy Guarantee:** Managers and other staff are mathematically blocked at the database level from ever seeing this tab. Only you and Brie can read and mark Whispers resolved.

### Tab 3: Predictive Schedule & Surge Forecaster
- Works alongside **Square Shifts / Payroll**.
- Combines Horseshoe Bay day-of-week curves, Hill Country lake/holiday surges, weather conditions (e.g., sunny 85°F+ iced-drink surges), and our **4909 RM 2147 Winter 2026 Grand Opening** multiplier.
- Shows you:
  - Projected daily revenue & **Target Labor Budget (28%)**
  - Recommended barista headcount for **Morning Rush (7am–11am)**, **Midday Flow (11am–2pm)**, and **Afternoon/Close (2pm–5pm)**
  - **Prep Alerts** (e.g., when to pre-stage an extra Cold Brew corny keg or extra 16oz iced cups).

### Tab 4: Loss/Shrinkage Watchdog, Espresso Telemetry & Equipment Tickets
- **Theoretical vs. Actual Shrinkage Watchdog (Owner-Only):** Compares what *should* have been used (`POS Sales × MenuMetrics Recipe Specs + Logged Waste`) against what *actually* disappeared in Par Counts. Flags unaccounted milk, bean, or cup loss early.
- **Morning Espresso Dial-In Log:** Shows every morning calibration shot logged by baristas (bean, dose grams in, yield grams out, seconds, and whether it’s in spec).
- **Equipment Tickets:** Per your standing rule, equipment issues never pollute the food/drink Waste Log—they land here + Team Chat so you can see what’s open or mark it **Resolved**.

### Tab 5: 5-Tier Budgets, Skill Ranks & Vendor Line
- Displays the spending & AI compute guardrails across the company and shows incoming **Vendor & Event Partner updates** (`/api/vendor/intake`)—such as roaster delivery ETAs, price-change notices, or local musician event requests.

### Tab 6: XR Latte Art Simulator & Orbital Lab
- Interactive preview of our **zero-milk-waste Virtual Pitcher & Crema Pour Simulator** (steamer tilt angle, spout height, wrist oscillation Hz) and the closed-loop mass-balance checklist that scales Kynda from **4909 RM 2147** to future multi-unit pods and eventually the first orbital coffee house.

---

## 4. All Other Owner-Control Surfaces Across Kynda

| Area | Path | What You Do There |
| :--- | :--- | :--- |
| **Team & Role Access** | `/admin/team` | Invite new hires by email (auto-sends onboarding packet) and set roles (`Owner`, `Team Lead / Manager`, `Barista / Staff`). |
| **Onboarding & Handbook** | `/admin/team-ops` | Upload required forms (W-4, I-9, TABC, Food Handler), edit Employee Handbook sections, and track each hire's completion progress. |
| **AI Hiring & Careers** | `/admin/careers` | Review job applications ranked by AI score, read AI interview summaries, and move candidates from `New → Interview → Hired`. |
| **Master Par List & Ordering** | `/admin/ingredients` | View the 108 canonical HEB + Amazon items, adjust par targets, and approve suggested purchase orders (`order = par − on_hand + 7d_waste`). |
| **Waste Cost Reports** | `/admin/waste` | View weekly/monthly dollar waste by reason (`expired`, `spilled`, `damaged`) and save monthly snapshots. |
| **Recipes & How-To Admin** | `/admin/recipes` & `/admin/how-to` | Add or edit official drink/food recipes and step-by-step equipment cleaning/keg guides. |
| **Checklists & Audit Log** | `/admin/checklists` | Edit Opening, Mid-Shift, and Closing checklist items and audit who completed what and when. |
| **Shipping Auto-Label** | `POST /api/admin/shipping/auto-label` | Automatically selects mailer vs. box, carrier service, 4×6 thermal ZPL label, and decrements packaging stock. |

---

## 5. Your Daily & Weekly Rhythm (10 Minutes Total)

- **Daily (3 minutes with morning coffee):**
  1. Open `/admin/command-center` → check yesterday/today's revenue & Attention Queue.
  2. Tap into `/admin/kaizen` → check for any **🔒 Owner Whispers**, open **Equipment Tickets**, or new **Kaizen Proposals** to approve.
- **Weekly (Monday or Thursday, 10 minutes):**
  1. Approve queued social posts in `/admin/marketing/approvals`.
  2. Check `/admin/kaizen` → **Predictive Schedule & Surge** tab before publishing the next week’s Square schedule.
  3. Review `/admin/ingredients` after staff submit their Par Counts to approve the weekly HEB / monthly Amazon order.
