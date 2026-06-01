# Fix Logo Cache Refresh

## Goal

When `frontend/public/brand/logo.png` is replaced, users should see the new logo immediately after redeploy instead of waiting for browser/CDN cache expiry.

## Requirements

- Keep the visible sidebar logo image sourced from the replacement file under `frontend/public/brand/logo.png`.
- Bust the current cached `/brand/logo.png` URL used by the frontend.
- Reduce future stale-logo risk for `/brand/` assets without affecting hashed Vite `/assets/` caching.
- Do not change navigation layout, logo sizing, or unrelated brand text.

## Acceptance Criteria

- The header logo uses a cache-busting URL that points to `/brand/logo.png`.
- Nginx no longer tells browsers to reuse `/brand/` assets for a full day without revalidation.
- Frontend build succeeds.
- The running frontend container serves the updated cache headers after rebuild.

## Relevant Files

- `frontend/src/components/common/AppHeader.vue`
- `frontend/nginx.conf`
