## 2026-05-27 - Missing Authentication on Admin API Routes
**Vulnerability:** Several API routes under `src/app/api/admin/` (such as `settings`, `integrations`, `promo-codes`, and `gift-cards`) were completely exposed and missing authentication checks.
**Learning:** `middleware.ts` was explicitly skipping route protection for `/api/*` endpoints. As a result, the backend relies on individual route handlers to manually verify authentication via `getAdminUser(req)`. It was assumed that middleware protected these routes, which was incorrect.
**Prevention:** Always verify that internal administrative endpoints enforce authentication manually via `getAdminUser` when working in this project, and never assume middleware covers `/api/` paths unless explicitly verified.
