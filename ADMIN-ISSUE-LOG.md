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

## Pending Issues (From Audit)

(Audit subagents running — findings will be appended below when complete)
