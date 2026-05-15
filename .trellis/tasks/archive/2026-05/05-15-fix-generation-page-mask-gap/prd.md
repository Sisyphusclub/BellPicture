# Fix generation page mask gap and result actions

## Goal

Fix regressions on the generated-image result page so the visual stage covers the whole top area and result actions behave like native app actions instead of navigating away.

## What I already know

- The screenshot shows the stage background/mask missing across the top-left header band on the generation result page.
- The user reported that clicking save does not automatically download; it navigates to a black image detail/document page and is hard to return from.
- `frontend/src/views/GenerateView.vue` owns the result stage, decorative stage pseudo-elements, generated result image display, and save action.
- `frontend/src/utils/download.ts` currently uses a plain `<a download>` link against backend output URLs.
- Backend output URLs are cross-origin in local dev (`localhost:5173` frontend to `localhost:3000` backend), so browsers may ignore `download` and navigate to the image resource.

## Requirements

- Extend the generation stage decorative background/mask into the top header area so there is no visible blank strip at the top-left.
- Preserve the existing centered header and generated result layout.
- Make save/download fetch the image as a blob and download from an object URL so cross-origin backend output URLs do not navigate away.
- Keep save failures in-app with Simplified Chinese feedback instead of letting browser navigation become the error mode.
- Apply the download behavior consistently anywhere the shared `downloadUrl` helper is used.

## Acceptance Criteria

- [ ] On the generated result page, the top-left area under/around the header has continuous stage background coverage with no missing mask strip.
- [ ] Clicking `保存` on the generated result page starts a file download and does not navigate to a standalone image page.
- [ ] Download helper has regression coverage for blob-based downloads and object URL cleanup.
- [ ] Frontend tests/typecheck pass for the touched areas.
- [ ] UI is visually checked in browser against the reported screenshot area.

## Definition of Done

- Tests added/updated for changed behavior.
- Lint/typecheck/build or targeted frontend checks run as appropriate.
- Browser verification performed for the visual mask and save action, or any limitation is reported.

## Added Scope: Homepage Gallery Publishing

The user expanded the task with homepage gallery behavior:

- Rename the homepage `最近创作` section to `画廊`.
- Remove the eyebrow text `本地灵感`.
- Change the section description to `从画廊中预览灵感，点击图片查看提示词细节。`
- Turn the existing `公开` composer control into a real toggle.
- When `公开` is enabled for a generation, generated images should be marked public and appear in the homepage gallery.
- Non-public generations should remain available in image management/history, but should not be shown in the homepage gallery.

### Added Acceptance Criteria

- [ ] Homepage section title is `画廊`; `本地灵感` is no longer rendered.
- [ ] Homepage gallery description reads `从画廊中预览灵感，点击图片查看提示词细节。`
- [ ] The `公开` control is clickable and has visible active/inactive state.
- [ ] `/api/images/generate` accepts an `isPublic` boolean and persists it with each generated image record.
- [ ] `/api/history` returns `isPublic`, and the homepage gallery filters to public entries only.
- [ ] Image management/history still shows both public and private generated images.

## Out of Scope

- Redesigning the whole generation result layout.
- Changing backend output serving contracts.
- Adding a global multi-user public gallery feed beyond the current authenticated user's generated records.

## Technical Notes

- Relevant files:
  - `frontend/src/views/GenerateView.vue`
  - `frontend/src/utils/download.ts`
  - `frontend/tests/views/GenerateView.spec.ts`
- Relevant specs:
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/quality-guidelines.md`
