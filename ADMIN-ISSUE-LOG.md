# Kynda Admin — Issue Log & Audit Results

Last updated: 2026-06-22
Audit session: comprehensive admin page review

## Resolved Issues (This Session)

### 1. Team & Access — Self-role change blocked [FIXED]
- **Issue:** Owners couldn't change their own role; Jonathan stuck as "customer"
- **Root cause:** Blanket "can't change your own role" guard in PATCH /api/admin/team
- **Fix:** Replaced with demotion-only guard (can promote self, can't demote self)
- **Commit:** a62f81d

### 2. Careers — Openings were read-only [FIXED]
- **Issue:** Admin careers page showed static text for job openings, no add/edit/delete
- **Fix:** New CRUD API at /api/admin/careers/openings, AdminCareersClient rewritten with modal editor
- **Commit:** d30f0c4

### 3. Marketing — All API routes 403'd for owners [FIXED]
- **Issue:** All 9 marketing API routes checked raw profile.role strings ("admin"/"employee") instead of normalized tiers
- **Root cause:** Owners have role="owner" which doesn't match "admin" → 403 on every upload/list/process
- **Fix:** Converted all routes to requireTier() from lib/auth/team
- **Files:** media/list, media/upload, images/list, images/upload, images/process, images/alt-text, chat, social/posts, social/schedule, social/publish-now
- **Commit:** d30f0c4

### 4. Media Drop — Uploads not persisted, no delete [FIXED]
- **Issue:** Upload appeared to succeed but wasn't stored; no delete capability
- **Root cause:** Upload endpoint 403'd (auth bug above); toast fired "complete" even on failure
- **Fix:** Auth fix + error-aware toast + image thumbnails + DELETE endpoint + delete buttons
- **Commit:** d30f0c4

### 5. Marketing Images — No delete [FIXED]
- **Issue:** Could upload and process but couldn't delete images
- **Fix:** New DELETE /api/marketing/images endpoint (removes original + thumbnail + variants)
- **Commit:** d30f0c4

### 6. Careers — Application status buttons didn't work [FIXED]
- **Issue:** Clicking Reviewed/Interview/Hired etc. reloaded page with no change
- **Root cause:** /api/careers/applications PATCH queried profiles with `.eq("user_id", user.id)` but profiles table uses `id`, not `user_id` → profile always null → silent 403
- **Fix:** Rewrote to use requireTier("manager") + supabaseAdmin()
- **Commit:** e5aa356

### 7. Accounting page removed [DONE]
- **Issue:** Replaced by local Kynda-Books solution
- **Fix:** Removed page, API routes, sidebar entry, sitemap entry, owner-only path, test
- **Commit:** e5aa356

### 8. Staff waste log + checklists auth bug [FIXED]
- **Issue:** Same raw role check as careers — owners/managers blocked from staff APIs
- **Fix:** Migrated to requireTier("staff") + supabaseAdmin()
- **Commit:** 96d05b9

### 9. Staff dashboard waste entry count always 0 [FIXED]
- **Issue:** `.eq("created_at::date", todayISO)` is invalid PostgREST syntax — silently always returned 0
- **Fix:** Changed to `.gte("created_at", todayISO + "T00:00:00").lt("created_at", todayISO + "T23:59:59")`
- **Commit:** f101d81

### 10. Training page excluded owners/managers [FIXED]
- **Issue:** Raw role check `profile.role !== "admin" && profile.role !== "staff"` excluded owners and managers
- **Fix:** Migrated to `normalizeRole()` + `isTeamMember()` from lib/auth/roles
- **Commit:** f101d81

## Pending Issues (From Audit — Staff/KDS Section)

### LOW priority — error handling improvements
- **Staff chat load():** No catch block — 500 from /api/staff/chat leaves UI stuck at "Loading chat…". Add error state.
- **Staff schedule load():** Same silent-error pattern — failed fetch shows "No published shifts" instead of error.
- **Staff par-counts load():** Same pattern — silently drops fetch errors.
- **Effort:** Quick fix for each — add .catch() with setError()

### LOW priority — missing UI feature
- **Staff schedule:** No UI to cancel a pending schedule request, even though PATCH /api/staff/schedule-requests supports `status: "cancelled"` for the request owner.
- **Effort:** Quick fix — add Cancel button next to pending requests

## Pending Issues (From Audit — Admin Pages Part 1)

### RESOLVED — Gift Cards page was fake [FIXED]
- **Issue:** Used hardcoded local state array, never called the real API
- **Fix:** Rewrote page to use GET/POST/PATCH /api/admin/gift-cards, added POST endpoint
- **Commit:** 6944355

### RESOLVED — Mass auth migration (35 routes) [FIXED]
- **Issue:** 35 admin API routes used legacy `getAdminUser` (email allowlist only) instead of `requireTier` — blocked non-allowlisted managers/owners
- **Fix:** Migrated ALL 35 routes to `requireTier(req, "manager")` from lib/auth/team
- **Commit:** 6944355

### RESOLVED — Products delete button disabled [FIXED]
- **Issue:** Delete button had `disabled` attribute with no handler, even though API supported deletion
- **Fix:** Wired up with confirm dialog + error handling
- **Commit:** 6944355

### RESOLVED — Square sync disconnected icon green [FIXED]
- **Issue:** "Not connected" status used text-forest (green) instead of red — confusing
- **Fix:** Changed to text-red-500
- **Commit:** 6944355

### MEDIUM priority — still pending
- **Admin settings integrations:** Calls `/api/admin/integrations` which now exists (was migrated to requireTier) but may return empty/stub data — needs verification that it actually checks env vars for integration status
- **Admin analytics revenue:** `totalRevenue` may sum all orders instead of last 30 days — needs query audit
- **Admin inventory:** Read-only table with no inline editing for thresholds/stock counts — needs PATCH handlers + inline UI
- **Admin promo-codes:** Delete/toggle failures silently swallowed — needs error toast branches

## Pending Issues (From Audit — Admin Pages Part 2)

### RESOLVED — Marketing dashboard exposed agent key [FIXED]
- **Issue:** `process.env.NEXT_PUBLIC_AGENT_API_KEY` sent in client-side fetch header — visible in browser bundle
- **Fix:** Removed header; loop/run endpoint now accepts requireTier("manager") session as third auth option
- **Commit:** 0f4c852

### RESOLVED — Mockups sync raw auth [FIXED]
- **Issue:** `/api/admin/mockups/sync` used createClient + getUser() with no tier check — any authenticated user could trigger Printful sync
- **Fix:** Migrated to requireTier("manager")
- **Commit:** 0f4c852

### RESOLVED — Marketing social null reference [FIXED]
- **Issue:** `post.image_urls.length` threw TypeError when image_urls was null
- **Fix:** Optional chaining: `post.image_urls?.length`
- **Commit:** 0f4c852

### MEDIUM priority — still pending
- **Image-sync / sync-catalog:** Admin page calls /api/square/sync-catalog which only accepts CRON_SECRET or AGENT_API_KEY — browser call gets 401. Needs a separate requireTier-protected admin endpoint or proxy
- **QR Tables:** Uses localStorage only, no backend persistence — data lost across devices/incognito. Needs DB table + API

### LOW priority — still pending
- **Marketing social filter badges:** Show total count for every status tab instead of per-status count
- **Training page:** `.limit(1)` on courses query means only one course is ever shown — may need a course selector if multiple courses exist
