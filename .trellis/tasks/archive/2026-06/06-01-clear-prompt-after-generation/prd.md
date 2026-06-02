# Clear prompt after generation

## Goal

When a user submits a prompt from the image generation composer, clear the composer prompt only after the generation request completes successfully. If generation fails, preserve the submitted prompt so the user can edit or retry without retyping.

## What I Already Know

- The generation composer state is owned by `frontend/src/views/GenerateView.vue`.
- `runGeneration()` snapshots the prompt before calling `useImageGeneration().generate()`.
- Successful generations already update the active batch, refresh quota, update public gallery state, and show a success toast.
- Failure handling stores an error message on the pending generation and shows an error toast.
- `frontend/tests/views/GenerateView.spec.ts` has existing harness helpers for resolving generation promises and exercising the dock composer.

## Requirements

- Clear `prompt.value` after `generate()` resolves and the successful result has been processed.
- Do not clear the prompt before the request resolves.
- Do not clear the prompt when generation throws.
- Keep result cards/history prompts unchanged because they use the submitted snapshot/result data, not the composer input.

## Acceptance Criteria

- [x] After a successful generation, the visible generation composer textarea is empty.
- [x] After a failed generation, the visible composer textarea still contains the submitted prompt.
- [x] Existing generation submit options still include the trimmed prompt, model, count, aspect ratio, reference inputs, and public visibility.
- [x] Focused `GenerateView` tests pass.

## Definition of Done

- Tests added or updated for success and failure behavior.
- Frontend lint/typecheck/test run where feasible.
- Trellis spec update considered; no cross-cutting spec change expected for this narrow UI behavior.

## Out of Scope

- Clearing reference images, model, count, aspect ratio, or public visibility after success.
- Changing backend generation behavior.
- Changing history, gallery, or regeneration semantics.

## Technical Notes

- Relevant specs read:
  - `.trellis/spec/frontend/index.md`
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/hook-guidelines.md`
  - `.trellis/spec/frontend/state-management.md`
  - `.trellis/spec/frontend/quality-guidelines.md`
  - `.trellis/spec/frontend/type-safety.md`
  - `.trellis/spec/guides/index.md`
- Focused verification: `npm test -- GenerateView`.
