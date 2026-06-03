# Rebuild Frontend After Logo Replacement

## Goal

Make the already-replaced frontend logo asset visible in the deployed frontend.

## Requirements

- Treat `frontend/public/brand/logo.png` as the source logo replacement provided by the user.
- Rebuild the frontend container image so nginx serves the updated static asset.
- Do not change application code unless investigation shows the deployed page references a different logo path.
- Preserve the user's logo file change.

## Acceptance Criteria

- [x] The frontend container is rebuilt and restarted.
- [x] The public site responds successfully after rebuild.
- [x] The served logo asset differs from the previous deployed asset or matches the updated local asset path.

## Out of Scope

- Changing logo sizing, layout, or branding text.
- Committing the user's replacement asset unless explicitly requested.

## Technical Notes

- Relevant logo source: `frontend/public/brand/logo.png`.
- Local updated logo SHA-256: `97ac8fdd0bec68907b30de8be5896ab4ac1f708bdc372380a23cbf58ac30e2fd`.
- Container-served logo SHA-256 after rebuild: `97ac8fdd0bec68907b30de8be5896ab4ac1f708bdc372380a23cbf58ac30e2fd`.
- Public logo downloaded from `https://pic.chen08.de/brand/logo.png?v=logo-recheck-20260603` matched the same SHA-256 after rebuild.
- Public homepage responded `HTTP 200` after rebuild.
- Public homepage references rebuilt JS asset `assets/index-v25SKv0G.js`, matching the container copy.
