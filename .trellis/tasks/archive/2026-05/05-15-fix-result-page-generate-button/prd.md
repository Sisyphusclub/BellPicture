# Fix result-page generate button

## Goal

Fix the result page bottom composer so clicking `生成` reliably starts a new image generation from the current prompt. The user reports that after a generation completes, clicking the bottom-right `生成` button on the result page has no visible effect.

## What I already know

- The active generation/result page lives in `frontend/src/views/GenerateView.vue`.
- The result page bottom composer uses `form.prompt-showcase--dock` and `@submit.prevent="handleSubmit"`.
- The submit button is visually enabled when the prompt is non-empty.
- Existing tests cover home form submit and result actions, but do not explicitly click the dock composer `生成` button after a result is shown.
- User screenshot shows a completed result page with bottom composer prompt text and enabled `生成` button, but clicking it reportedly does nothing.

## Requirements

- On the completed result page, clicking the bottom composer `生成` button must immediately enter the inline `生成中...` loading state.
- The new request must use the current bottom composer prompt/model/count/aspect/reference-file state.
- Pressing Enter in the result-page composer must keep working.
- Home page generation behavior must not regress.
- Result actions `重新编辑`, `再次生成`, and `保存` must keep working.
- Keep the homepage title and result page composer style unchanged from the previous completed UI task.

## Acceptance Criteria

- [ ] A regression test reproduces result-page bottom `生成` click after a completed result and verifies `generate()` is called again.
- [ ] The same test verifies the inline loading surface appears after the dock button click.
- [ ] Existing GenerateView tests continue to pass.
- [ ] Frontend format, lint, typecheck, tests, and build pass.
- [ ] Browser smoke confirms the completed result page `生成` button enters loading state.

## Definition of Done

- Implementation completed via `trellis-implement`.
- Independent `trellis-check` verifies behavior and quality commands.
- Work commits created before `/trellis:finish-work`.

## Out of Scope

- Redesigning the result page again.
- Changing backend generation APIs.
- Fixing broken historical image URLs unless directly required for this button bug.
- Adding new generation settings.

## Technical Approach

- Add a view test that mounts `GenerateView`, completes one generation, then clicks the dock composer `生成` button and expects a second `generate()` call plus `生成中...`.
- Fix the dock composer submission path in `GenerateView.vue`; prefer a direct, explicit click path for the dock generate button if submit bubbling is unreliable.
- Preserve the existing form submit handler for keyboard submit and home composer.

## Technical Notes

- Main target: `frontend/src/views/GenerateView.vue`.
- Test target: `frontend/tests/views/GenerateView.spec.ts`.
