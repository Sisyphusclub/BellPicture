# Translate Demo Prompts To Chinese

## Goal

Change the configured/demo prompt copy from English to Simplified Chinese so Chinese input feels natural while preserving the same generation intent and existing workflow.

## What I Already Know

- User asked to directly translate the English demo prompts into Chinese.
- Frontend guidelines require all user-facing copy to be Simplified Chinese by default.
- The generator UI already has Chinese visible copy in `frontend/src/views/GenerateView.vue`; demo prompt cache configuration may live in env/config files.

## Assumptions

- Keep prompt meaning, count, and delimiters unchanged.
- Do not change generation logic, API behavior, layout, or model configuration.

## Requirements

- Translate the existing English demo prompt texts into natural Simplified Chinese.
- Preserve exact config formatting used by the app, including prompt delimiters.
- Make demo prompt cache matching tolerant of whitespace introduced by browser copy/paste.
- Seed the translated demo prompts with prepared cache files so live demos do not need another full provider call.
- Let configured demo prompts use prepared cache files even when a reference image is attached, while preserving image-to-image mode and reference metadata in history.
- Update any tests or documented examples only if they assert the old English prompt text.

## Acceptance Criteria

- [ ] No English demo prompt examples remain in active app/config surfaces.
- [ ] Browser-pasted demo prompts with internal line breaks still hit the demo cache.
- [ ] Translated demo prompts have prepared cache files in the running backend volume.
- [ ] Configured demo prompts with reference images return cached results in image-to-image mode without calling the provider.
- [ ] Existing lint/type-check or focused tests pass for the touched package where practical.
- [ ] Git diff shows only scoped copy/config/test updates plus Trellis task bookkeeping.

## Out Of Scope

- Adding a demo button or changing how demo prompts are selected.
- Changing backend prompt-cache matching behavior.
- Redesigning the generator UI.

## Technical Notes

- Relevant specs: `.trellis/spec/frontend/index.md`, `.trellis/spec/frontend/component-guidelines.md`, `.trellis/spec/frontend/quality-guidelines.md`, `.trellis/spec/frontend/type-safety.md`.
- Product context: `PRODUCT.md` says the app should use concise Simplified Chinese UI copy.
