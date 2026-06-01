# Reduce Sidebar Logo Size

## Goal

Make the sidebar logo feel less oversized after the brand image replacement.

## Requirements

- Reduce the rendered logo image size in the app sidebar.
- Keep the existing sidebar brand button/click target dimensions.
- Keep the logo URL cache-busting behavior unchanged.
- Do not change navigation layout, labels, or unrelated branding.

## Acceptance Criteria

- Desktop sidebar logo image is smaller than the previous 50px size.
- Mobile/sidebar compact logo image is smaller than the previous 38px size.
- AppHeader tests cover the adjusted logo dimensions.
- Frontend checks pass and the frontend container is rebuilt.

## Relevant Files

- `frontend/src/components/common/AppHeader.vue`
- `frontend/tests/components/AppHeader.spec.ts`
