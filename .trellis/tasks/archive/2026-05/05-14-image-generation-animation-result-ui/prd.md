# ChatGPT-style image generation animation and result layout

## Goal

Redesign the generation flow so clicking `生成` feels like a polished ChatGPT-style image-generation experience: the page should immediately transition into a centered generation item with a live animated placeholder, then resolve into a clean result view with the generated image and concise action pills. The result surface should feel calm, editorial, premium, and task-focused, matching Ref2Image Studio's product direction rather than a generic AI dashboard.

## What I already know

- User provided two visual references:
  - Loading state: centered date + prompt + `GPT-IMAGE-2` pill + square placeholder with soft purple dotted shimmer + dark `生成中...` badge + action pills below.
  - Completed state: full page with soft blue/pink tile background, top nav, centered result item, generated square image, action pills (`重新编辑`, `再次生成`, `保存`), and bottom composer.
- The request is frontend UI/UX only: add generation animation and redesign the result page.
- Existing `frontend/src/views/GenerateView.vue` owns the generation page, home prompt composer, displayed batch result, sidebar history, bottom composer, and floating loading/error status.
- Existing `useImageGeneration()` exposes `isLoading`, `statusMessage`, and `lastBatch`; `handleSubmit()` currently waits for `generate()` to resolve, then sets `activeBatchId` to show result.
- Current loading UX is only a small fixed floating status at bottom-right; no inline placeholder appears where the image will land.
- Current completed result UX is a two-column card (`preview + info`) inside a sidebar layout, which does not match the provided reference.
- Product context: product UI, not marketing. Brand should be minimal, editorial, exacting, spacious, restrained, tactile, and confident. App copy is Simplified Chinese.
- DESIGN.md is currently missing; this task uses PRODUCT.md + existing CSS/tokens as the source of truth.

## Assumptions (temporary)

- `ChatGPT-style` means inspired interaction pattern and visual timing, not copying OpenAI branding exactly.
- The MVP can implement a deterministic CSS loading placeholder rather than streaming partial image pixels from the backend.
- The generated image itself is only available after the existing API call completes.
- Existing generation backend/API behavior remains unchanged.

## Open Questions

- None.

## Requirements

- Completed and generating states use a full conversation-style page, not the current left-sidebar result layout.
- On submit, immediately move from the home composer into a result/generation surface instead of only showing a floating status.
- During generation, show a centered generation item with:
  - date label,
  - current prompt,
  - `GPT-IMAGE-2` pill,
  - square animated image placeholder,
  - visible `生成中...` badge,
  - restrained action pills below.
- The loading placeholder should use premium restrained motion: soft dotted field, gentle shimmer/pulse, no spinner, no bounce/elastic animation.
- When generation completes, the same surface should resolve into the generated image with a polished reveal.
- Completed result surface should include concise actions: `重新编辑`, `再次生成`, `保存`.
- Hide the current left history sidebar on the active generation/result page; history can remain accessible through existing history surfaces/routes.
- Bottom composer should remain available on the result page for continuing work.
- Error state should preserve the user's prompt and keep the composer usable.
- Respect reduced-motion preferences.
- Keep all user-facing text in Simplified Chinese.

## Acceptance Criteria (evolving)

- [ ] Clicking `生成` immediately displays an inline generation card/surface with the submitted prompt and `生成中...` badge.
- [ ] The animated placeholder visually resembles the provided ChatGPT-style dotted shimmer reference and is implemented with CSS, not a static image.
- [ ] When the API resolves, the generated image replaces the placeholder in-place or in the same visual position with a subtle reveal.
- [ ] Completed result page resembles the second reference: centered result item, no left sidebar, soft gradient/tile atmosphere, action pills under the image, and bottom composer.
- [ ] `重新编辑` restores/keeps the prompt in the composer for editing.
- [ ] `再次生成` re-submits the same prompt/model/settings without requiring copy/paste.
- [ ] `保存` downloads the generated image using existing download utilities.
- [ ] Existing generation, upload, aspect ratio, quota refresh, and history persistence still work.
- [ ] Frontend lint/typecheck/tests pass.
- [ ] Manual browser smoke verifies loading animation, success reveal, actions, and responsive layout.

## Definition of Done

- PRD approved.
- Relevant frontend specs/context curated in `implement.jsonl` and `check.jsonl`.
- Implementation completed via `trellis-implement` sub-agent.
- `trellis-check` verifies UI behavior, accessibility basics, lint/typecheck/tests, and browser smoke where possible.
- Spec updated only if a reusable UI/state convention emerges.
- Work commits created before `/trellis:finish-work`.

## Out of Scope

- Backend streaming/progressive image generation.
- Changing provider APIs or response shape.
- Multi-image masonry redesign outside the active generation/result surface.
- Replacing app authentication/topbar behavior.
- Persisting new animation state to backend or history records.

## Technical Notes

- Main target file: `frontend/src/views/GenerateView.vue`.
- Existing state hooks:
  - `useImageGeneration()` provides `isLoading`, `statusMessage`, `lastBatch`, `generate()`.
  - `useImageHistory()` provides `batches`, `entries`, and history persistence.
  - `useImageQuota()` refreshes quota after generation.
- Current result display is gated by `displayedBatch`; loading can be represented by a separate pending-generation state before `lastBatch` exists.
- Current CSS already has product tokens, home hero background, bottom composer, and floating status that can be replaced or integrated.

## Technical Approach

- Add a pending generation view model in `GenerateView.vue` so the UI can render the submitted prompt immediately while `generate()` is still in flight.
- Replace the displayed-batch branch with a conversation-style result stage for both pending and completed states.
- Hide the result-page sidebar by treating pending/completed generation as the same full-width stage class; preserve history data and routes, but do not show the left rail on this surface.
- Use CSS-only loading art: square frame, dotted radial pattern, subtle shimmer/pulse, and a dark `生成中...` badge.
- Reuse existing `downloadUrl`, `generate()`, `refreshQuota()`, and history persistence; do not change backend contracts.
- Implement `重新编辑`, `再次生成`, and `保存` as direct actions in `GenerateView.vue`.

## Decision (ADR-lite)

**Context**: The existing result UI is a side-by-side dashboard card with a persistent history sidebar. The user wants a ChatGPT/7Ai-like generation flow where the active request becomes the page's focal point.

**Decision**: Use a full conversation-style result page for generating and completed states: centered result item, hidden left sidebar, bottom composer retained, and inline loading placeholder that resolves into the image.

**Consequences**: The active generation surface becomes calmer and closer to the reference, but quick history navigation is no longer visible on that page. History remains available through the existing history route and can be reintroduced later as a subtle entry if needed.

## Design Direction

Physical scene: a creator is working at a desktop in a focused afternoon session, watching one image request resolve without leaving the canvas. The interface should be light, spacious, tactile, and quiet, with motion that explains state rather than decorates it.

Color strategy: restrained product palette with tinted neutrals, soft blue/pink atmospheric background, and purple used only inside the loading placeholder and small state accents.

Motion strategy: 150–250ms transitions for UI controls, slower 1.8–2.4s looping shimmer for generation placeholder. Use transform/opacity/background-position only; no layout animation.

## Expansion Sweep

### Future evolution

- Later streaming/progressive image updates could plug into the same placeholder frame if backend supports partial progress.
- Multi-image batches may eventually need a row/stack of placeholders, but MVP can focus on the current default single image while preserving batch support.

### Related scenarios

- History item selection should still show a completed result surface, not the loading placeholder.
- Regeneration should reuse the same result layout and not route to a separate page.

### Failure / edge cases

- Failed generation should replace the placeholder with a calm error state and keep the prompt editable.
- Reduced-motion users should see a static soft placeholder with no shimmer loop.
- Small screens should keep the result centered and composer usable without horizontal overflow.
