# Use Local Replaceable Logo Asset

## Goal

Make the app header logo use a fixed, user-replaceable local static asset so the user can drop a replacement image into a known folder without changing code.

## Requirements

* The sidebar/header brand logo must load from `frontend/public/brand/logo.png` via the Vite public path `/brand/logo.png`.
* The existing bundled SVG logo import should no longer be required by `AppHeader.vue`.
* The image alt text should remain `Ref2Image Studio 标志`.
* The replacement workflow should be: replace `frontend/public/brand/logo.png`, then refresh the browser.

## Acceptance Criteria

* [ ] `AppHeader.vue` renders the logo image with `src="/brand/logo.png"` or an equivalent static public URL.
* [ ] `frontend/public/brand/logo.png` exists as the fixed replacement target.
* [ ] Frontend lint/typecheck relevant to the change passes.
* [ ] Chrome DevTools shows the header logo loading from `/brand/logo.png`.

## Definition of Done

* Lint / typecheck green for frontend or any failures are unrelated and documented.
* Existing header behavior remains unchanged except for the logo source.
* Browser page reload works without console errors related to the logo.

## Technical Approach

Use Vite's `public/` directory for a verbatim-served static file. Update `AppHeader.vue` to reference `/brand/logo.png` directly instead of importing `@/assets/ref2image-logo-mark.svg`. Add/ensure the public asset path exists.

## Decision (ADR-lite)

**Context**: The current logo is bundled from `src/assets`, which makes user replacement less direct.
**Decision**: Use `frontend/public/brand/logo.png` and reference it as `/brand/logo.png`.
**Consequences**: Replacing the logo becomes a file overwrite operation. The file name is fixed and PNG-specific.

## Out of Scope

* Logo upload UI or runtime configuration.
* Supporting multiple logo formats in one task.
* Changing other branding, navigation, or layout behavior.

## Technical Notes

* Current logo import: `frontend/src/components/common/AppHeader.vue` imports `@/assets/ref2image-logo-mark.svg`.
* Directory spec says `frontend/public/` is for verbatim-served static files.
